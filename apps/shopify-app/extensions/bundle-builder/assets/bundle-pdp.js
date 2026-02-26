/**
 * Bundle PDP — Full product page with gallery, variant picker, tabs,
 * and bundle builder. Uses BundleCore for shared pricing/cart logic.
 */
(function () {
  'use strict';

  var instances = new WeakMap();
  var Core = window.BundleCore;

  class BundlePDP {
    constructor(section) {
      this.section = section;
      this.selectedProducts = new Map();

      // Prevent enforceFreeGifts from removing gifts while PDP manages them
      Core._pdpManagingGifts = true;
      window.addEventListener('beforeunload', function () { Core._pdpManagingGifts = false; });

      var metafieldConfig = Core.parseMetafieldConfig(section.dataset.metafieldConfig);

      this.tiers = metafieldConfig ? metafieldConfig.tiers : Core.parseTiers(section.dataset.tiers);
      this.tierMode = section.dataset.tierMode || 'count'; // 'count' or 'subtotal'
      this.minItems = parseInt(section.dataset.minItems, 10) || 1;
      this.maxItems = parseInt(section.dataset.maxItems, 10) || 99;
      this.discountType = metafieldConfig ? metafieldConfig.discountType : (section.dataset.discountType || 'percentage');
      this.showSavings = section.dataset.showSavings === 'true';
      this.showTierProgress = section.dataset.showTierProgress === 'true';
      this.bundleName = section.dataset.bundleName || 'Bundle';
      this.bundleId = metafieldConfig ? metafieldConfig.bundleId : (section.dataset.bundleId || section.dataset.blockId || section.dataset.sectionId || 'bundle');
      this.ctaText = section.dataset.ctaText || 'Add Bundle to Cart';
      this.cartRedirect = section.dataset.cartRedirect === 'true';
      this.moneyFormat = section.dataset.moneyFormat || '';
      this.isLoading = false;
      this.isRedirecting = false;
      this.previousTierIndex = -1;
      this.notificationTimeout = null;
      this.activeFreeGifts = new Map();
      this.freeGiftPending = false;
      this.currentSlideIndex = 0;
      this.freeShippingThreshold = parseInt(section.dataset.freeShippingThreshold, 10) || 0;
      this.mainVariantPrice = 0;

      // Parse product variants
      this.variants = [];
      this.selectedOptions = {};
      var variantScript = section.querySelector('[data-pdp-variants]');
      if (variantScript) {
        try { this.variants = JSON.parse(variantScript.textContent); } catch (_e) { /* ignore */ }
      }

      // Parse media map (per-image variant_ids for size filtering within color)
      this.mediaMap = {};
      var mediaMapScript = section.querySelector('[data-pdp-media-map]');
      if (mediaMapScript) {
        try { this.mediaMap = JSON.parse(mediaMapScript.textContent); } catch (_e) { /* ignore */ }
      }

      this.els = {
        // Gallery
        gallery: section.querySelector('[data-gallery]'),
        slider: section.querySelector('[data-gallery-slider]'),
        thumbsContainer: section.querySelector('[data-gallery-thumbs]'),
        prevBtn: section.querySelector('[data-gallery-prev]'),
        nextBtn: section.querySelector('[data-gallery-next]'),
        // Variant options
        optionGroups: section.querySelectorAll('[data-option-group]'),
        // Price
        priceWrap: section.querySelector('[data-pdp-price]'),
        priceRegular: section.querySelector('[data-pdp-price-regular]'),
        priceCompare: section.querySelector('[data-pdp-price-compare]'),
        priceBadge: section.querySelector('[data-pdp-price-badge]'),
        // Tabs
        tabsContainer: section.querySelector('[data-pdp-tabs]'),
        // Tier (milestone bar + cards)
        tierSection: section.querySelector('[data-pdp-tier]'),
        tierLabel: section.querySelector('[data-pdp-tier-label]'),
        tierFill: section.querySelector('[data-pdp-tier-fill]'),
        tierDots: section.querySelector('[data-pdp-tier-dots]'),
        tierCards: section.querySelector('[data-pdp-tier-cards]'),
        tierCallout: section.querySelector('[data-pdp-tier-callout]'),
        tierCalloutText: section.querySelector('[data-pdp-tier-callout-text]'),
        // Bundle
        bundleItems: section.querySelectorAll('[data-pdp-bundle-item]'),
        savings: section.querySelector('[data-pdp-savings]'),
        itemCount: section.querySelector('[data-pdp-count]'),
        discount: section.querySelector('[data-pdp-discount]'),
        total: section.querySelector('[data-pdp-total]'),
        cta: section.querySelector('[data-pdp-cta]'),
        notification: section.querySelector('[data-pdp-notification]'),
        // Shipping bar
        shippingBar: section.querySelector('[data-pdp-shipping-bar]'),
        shippingText: section.querySelector('[data-pdp-shipping-text]'),
        shippingFill: section.querySelector('[data-pdp-shipping-fill]'),
        // Mobile sticky duplicates
        ctaMobile: section.querySelector('[data-pdp-cta-mobile]'),
        shippingBarMobile: section.querySelector('[data-pdp-shipping-bar-mobile]'),
        shippingTextMobile: section.querySelector('[data-pdp-shipping-text-mobile]'),
        shippingFillMobile: section.querySelector('[data-pdp-shipping-fill-mobile]'),
      };

      // Initialize selected options from active buttons/swatches
      var self = this;
      this.els.optionGroups.forEach(function (group) {
        var pos = group.dataset.optionPosition;
        var activeBtn = group.querySelector('.bb-pdp__swatch--active, .bb-pdp__option-btn--active, .bb-pdp__selectlike-option--active, .bb-pdp__size-pill--active');
        if (activeBtn && pos) {
          self.selectedOptions[pos] = activeBtn.dataset.optionValue;
        }
      });

      // Set initial main product variant price
      var initVariant = this.findVariant();
      if (initVariant) {
        this.mainVariantPrice = initVariant.price || 0;
      } else if (this.variants.length > 0) {
        // Fallback: use first available variant price
        for (var vi = 0; vi < this.variants.length; vi++) {
          if (this.variants[vi].available) {
            this.mainVariantPrice = this.variants[vi].price || 0;
            break;
          }
        }
      }

      this.initGallery();
      this.initSelectlike();
      this.initTabs();
      this.initTierCards();
      this.initStickyMobile();
      this.bindEvents();

      // Default to Queen if no variant specified in URL
      if (!window.location.search.includes('variant=')) {
        this.autoSelectSize('Queen');
      }

      this.recalculate();
    }

    /* ===== GALLERY ===== */

    initGallery() {
      if (!this.els.slider) return;
      var self = this;

      // Always apply JS-side variant media filtering on init.
      // Liquid does color-only filtering; JS refines to the correct
      // contiguous image run for the variant.
      var currentVariant = this.findVariant();
      if (currentVariant) {
        this.filterMediaByVariant(currentVariant);
      }

      // Set first visible thumb as active
      var firstThumb = this.els.thumbsContainer && this.els.thumbsContainer.querySelector('.bb-pdp__thumb:not([style*="display:none"])');
      if (firstThumb) firstThumb.classList.add('bb-pdp__thumb--active');

      // IntersectionObserver to track visible slide
      if ('IntersectionObserver' in window) {
        this._slideObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              var index = parseInt(entry.target.dataset.slideIndex, 10);
              self.onSlideChange(index);
            }
          });
        }, {
          root: self.els.slider,
          threshold: 0.6,
        });

        this.els.slider.querySelectorAll('.bb-pdp__slide').forEach(function (slide) {
          if (slide.style.display !== 'none') {
            self._slideObserver.observe(slide);
          }
        });
      }

      // Arrow buttons
      if (this.els.prevBtn) {
        this.els.prevBtn.addEventListener('click', function () { self.navigateSlide(-1); });
      }
      if (this.els.nextBtn) {
        this.els.nextBtn.addEventListener('click', function () { self.navigateSlide(1); });
      }

      // Thumbnail clicks
      if (this.els.thumbsContainer) {
        this.els.thumbsContainer.addEventListener('click', function (e) {
          var thumb = e.target.closest('.bb-pdp__thumb');
          if (!thumb) return;
          var slideIndex = parseInt(thumb.dataset.thumbIndex, 10);
          self.goToSlide(slideIndex);
        });
      }
    }

    navigateSlide(direction) {
      var visibleSlides = this.getVisibleSlides();
      if (visibleSlides.length === 0) return;

      var currentIdx = visibleSlides.findIndex(function (s) {
        return parseInt(s.dataset.slideIndex, 10) === this.currentSlideIndex;
      }.bind(this));

      if (currentIdx === -1) currentIdx = 0;
      var nextIdx = currentIdx + direction;
      if (nextIdx < 0) nextIdx = visibleSlides.length - 1;
      if (nextIdx >= visibleSlides.length) nextIdx = 0;

      var targetSlide = visibleSlides[nextIdx];
      this.goToSlide(parseInt(targetSlide.dataset.slideIndex, 10));
    }

    goToSlide(index) {
      if (!this.els.slider) return;
      var slide = this.els.slider.querySelector('[data-slide-index="' + index + '"]');
      if (!slide || slide.style.display === 'none') return;

      slide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      this.onSlideChange(index);
    }

    onSlideChange(index) {
      this.currentSlideIndex = index;
      if (!this.els.thumbsContainer) return;

      var thumbs = this.els.thumbsContainer.querySelectorAll('.bb-pdp__thumb');
      thumbs.forEach(function (t) { t.classList.remove('bb-pdp__thumb--active'); });

      var activeThumb = this.els.thumbsContainer.querySelector('[data-thumb-index="' + index + '"]');
      if (activeThumb) {
        activeThumb.classList.add('bb-pdp__thumb--active');
        // Scroll thumb into view
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }

    getVisibleSlides() {
      if (!this.els.slider) return [];
      return Array.from(this.els.slider.querySelectorAll('.bb-pdp__slide')).filter(function (s) {
        return s.style.display !== 'none';
      });
    }

    /**
     * Filter gallery to show images for a specific variant.
     * Uses the variant's featured_media_id to find its image group:
     * from that image forward until the next variant's featured_media.
     * This replicates per-variant (color+size) image sets.
     *
     * Fallback chain: variant group → alt-text color match → show all.
     */
    filterMediaByVariant(variant) {
      if (!this.els.slider || !this.els.thumbsContainer) return;
      var self = this;

      // Disconnect observer
      if (this._slideObserver) {
        this.els.slider.querySelectorAll('.bb-pdp__slide').forEach(function (slide) {
          self._slideObserver.unobserve(slide);
        });
      }

      var slides = Array.from(this.els.slider.querySelectorAll('.bb-pdp__slide'));
      var thumbs = Array.from(this.els.thumbsContainer.querySelectorAll('.bb-pdp__thumb'));

      var visibleIndices = this._buildVariantMediaGroup(variant, slides);

      // Dedup: remove visible slides with the same normalized CDN src
      var seenSrcs = {};
      var sortedVisible = Array.from(visibleIndices).sort(function (a, b) { return a - b; });
      sortedVisible.forEach(function (idx) {
        var slide = self.els.slider.querySelector('[data-slide-index="' + idx + '"]');
        if (!slide) return;
        var img = slide.querySelector('img');
        if (!img) return;
        var src = (img.getAttribute('src') || '').replace(/\?.*$/, '').replace(/_\d+x\d*\./, '_.');
        if (seenSrcs[src]) {
          visibleIndices.delete(idx);
          return;
        }
        seenSrcs[src] = true;
      });

      // Find which visible image is assigned to this variant (for ordering)
      var variantImageIdx = -1;
      sortedVisible.forEach(function (idx) {
        if (!visibleIndices.has(idx)) return;
        var entry = self.mediaMap[String(idx)];
        if (entry && entry.assigned && entry.variantIds && entry.variantIds.indexOf(variant.id) !== -1) {
          if (variantImageIdx === -1) variantImageIdx = idx;
        }
      });
      // Show/hide and reorder: variant-assigned image first (like original theme)
      slides.forEach(function (slide) {
        var idx = parseInt(slide.dataset.slideIndex, 10);
        if (visibleIndices.has(idx)) {
          slide.style.display = '';
          slide.style.order = (idx === variantImageIdx) ? '-1' : '';
        } else {
          slide.style.display = 'none';
          slide.style.order = '';
        }
      });
      thumbs.forEach(function (thumb) {
        var idx = parseInt(thumb.dataset.thumbIndex, 10);
        if (visibleIndices.has(idx)) {
          thumb.style.display = '';
          thumb.style.order = (idx === variantImageIdx) ? '-1' : '';
        } else {
          thumb.style.display = 'none';
          thumb.style.order = '';
        }
      });

      // Reconnect observer for visible slides
      if (this._slideObserver) {
        slides.forEach(function (slide) {
          if (slide.style.display !== 'none') {
            self._slideObserver.observe(slide);
          }
        });
      }

      // Scroll to variant-assigned image (or first visible)
      var targetSlide = variantImageIdx >= 0
        ? this.els.slider.querySelector('[data-slide-index="' + variantImageIdx + '"]')
        : this.getVisibleSlides()[0];
      if (targetSlide && targetSlide.style.display !== 'none') {
        targetSlide.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'start' });
        this.onSlideChange(parseInt(targetSlide.dataset.slideIndex, 10));
      } else {
        var firstVisible = this.getVisibleSlides()[0];
        if (firstVisible) {
          firstVisible.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'start' });
          this.onSlideChange(parseInt(firstVisible.dataset.slideIndex, 10));
        }
      }
    }

    /**
     * Build visible indices for a variant's image group.
     *
     * Clean approach:
     * 1. Color alt-text → get same-color images
     * 2. Variant filter → remove images assigned to OTHER size variants
     * 3. If <=8 remain → show all (small set, no dupes)
     * 4. If >8 → group into contiguous runs, pick run closest to featured
     * 5. Fallback for colors with no alt-text → variant_ids + featured
     *
     * Excluded indices (from block setting) are applied in filterMediaByVariant.
     */
    _buildVariantMediaGroup(variant, slides) {
      var visibleIndices = new Set();
      var variantId = variant.id;
      var self = this;
      var hasMediaMap = Object.keys(this.mediaMap).length > 0;

      // --- Find color option ---
      var colorPosition = -1;
      this.els.optionGroups.forEach(function (group) {
        var name = (group.dataset.optionName || '').toLowerCase();
        if (name === 'color' || name === 'colour' || name === 'colors') {
          colorPosition = parseInt(group.dataset.optionPosition, 10);
        }
      });
      if (colorPosition < 1) {
        slides.forEach(function (s) { visibleIndices.add(parseInt(s.dataset.slideIndex, 10)); });
        return visibleIndices;
      }
      var colorName = variant.options[colorPosition - 1];
      if (!colorName) {
        slides.forEach(function (s) { visibleIndices.add(parseInt(s.dataset.slideIndex, 10)); });
        return visibleIndices;
      }

      // --- Find featured media position ---
      var featuredMediaId = variant.featured_media_id || null;
      var featuredIndex = -1;
      if (featuredMediaId) {
        slides.forEach(function (slide) {
          if (parseInt(slide.dataset.mediaId, 10) === featuredMediaId) {
            featuredIndex = parseInt(slide.dataset.slideIndex, 10);
          }
        });
      }

      // --- Collect same-color slide indices ---
      var colorIndices = [];
      slides.forEach(function (slide) {
        if (slide.dataset.mediaColor === colorName) {
          colorIndices.push(parseInt(slide.dataset.slideIndex, 10));
        }
      });

      // --- FALLBACK: no alt-text images for this color ---
      if (colorIndices.length === 0) {
        // Show variant-assigned images + featured
        if (hasMediaMap) {
          slides.forEach(function (slide) {
            var idx = parseInt(slide.dataset.slideIndex, 10);
            var entry = self.mediaMap[String(idx)];
            if (entry && entry.assigned && entry.variantIds && entry.variantIds.indexOf(variantId) !== -1) {
              visibleIndices.add(idx);
            }
          });
        }
        if (featuredIndex >= 0) visibleIndices.add(featuredIndex);
        if (visibleIndices.size >= 1) return visibleIndices;
        // Last resort: all images
        slides.forEach(function (s) { visibleIndices.add(parseInt(s.dataset.slideIndex, 10)); });
        return visibleIndices;
      }

      // --- Step 1: variant filter on ALL color images ---
      // Shared (no variant_ids) → keep. Assigned to this variant → keep. Assigned to other → drop.
      var filtered = [];
      colorIndices.forEach(function (idx) {
        if (hasMediaMap) {
          var entry = self.mediaMap[String(idx)];
          if (entry && entry.assigned && entry.variantIds && entry.variantIds.length > 0) {
            if (entry.variantIds.indexOf(variantId) === -1) return;
          }
        }
        filtered.push(idx);
      });

      if (filtered.length === 0) {
        // Variant filter eliminated everything — fall back to featured only
        if (featuredIndex >= 0) visibleIndices.add(featuredIndex);
        return visibleIndices;
      }

      // --- Step 2: if small set, just show them ---
      if (filtered.length <= 8) {
        filtered.forEach(function (idx) { visibleIndices.add(idx); });
        return visibleIndices;
      }

      // --- Step 3: group filtered images into contiguous runs ---
      filtered.sort(function (a, b) { return a - b; });
      var runs = [];
      var currentRun = [filtered[0]];
      for (var i = 1; i < filtered.length; i++) {
        if (filtered[i] - filtered[i - 1] <= 2) {
          currentRun.push(filtered[i]);
        } else {
          runs.push(currentRun);
          currentRun = [filtered[i]];
        }
      }
      runs.push(currentRun);

      // --- Step 4: pick the best gallery run (3+ images) ---
      // If featured is INSIDE a run, pick that run. Otherwise pick the first
      // run (lowest indices = primary/original images).
      var galleryRuns = runs.filter(function (r) { return r.length >= 3; });
      var bestRun = null;

      if (galleryRuns.length === 1) {
        bestRun = galleryRuns[0];
      } else if (galleryRuns.length > 1 && featuredIndex >= 0) {
        // Check if featured is actually inside a run
        for (var r = 0; r < galleryRuns.length; r++) {
          if (galleryRuns[r].indexOf(featuredIndex) !== -1) {
            bestRun = galleryRuns[r];
            break;
          }
        }
        // Featured not in any run — pick first (primary) run
        if (!bestRun) bestRun = galleryRuns[0];
      } else if (galleryRuns.length > 1) {
        bestRun = galleryRuns[0];
      }

      if (bestRun) {
        bestRun.forEach(function (idx) { visibleIndices.add(idx); });
      } else {
        filtered.forEach(function (idx) { visibleIndices.add(idx); });
      }

      // Always include the variant's featured image so it can be ordered first.
      // URL dedup in filterMediaByVariant will remove it if it's a duplicate.
      if (featuredIndex >= 0) {
        visibleIndices.add(featuredIndex);
      }

      return visibleIndices;
    }

    /* ===== SELECTLIKE DROPDOWN ===== */

    initSelectlike() {
      var self = this;
      var selectlikes = this.section.querySelectorAll('[data-selectlike]');

      selectlikes.forEach(function (sl) {
        var trigger = sl.querySelector('[data-selectlike-trigger]');
        if (!trigger) return;

        trigger.addEventListener('click', function (e) {
          e.stopPropagation();
          sl.classList.toggle('bb-pdp__selectlike--open');
        });

        // Close on outside click
        document.addEventListener('click', function () {
          sl.classList.remove('bb-pdp__selectlike--open');
        });

        // Prevent menu clicks from closing
        var menu = sl.querySelector('[data-selectlike-menu]');
        if (menu) {
          menu.addEventListener('click', function (e) {
            e.stopPropagation();
          });
        }
      });
    }

    /* ===== TABS ===== */

    initTabs() {
      var tabsContainer = this.els.tabsContainer;
      if (!tabsContainer) return;

      var buttons = tabsContainer.querySelectorAll('.bb-pdp__tab-btn');
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var targetId = btn.dataset.tabTarget;
          if (!targetId) return;

          // Deactivate all
          buttons.forEach(function (b) { b.classList.remove('bb-pdp__tab-btn--active'); });
          tabsContainer.querySelectorAll('.bb-pdp__tab-panel').forEach(function (p) {
            p.classList.remove('bb-pdp__tab-panel--active');
          });

          // Activate target
          btn.classList.add('bb-pdp__tab-btn--active');
          var panel = document.getElementById(targetId);
          if (panel) panel.classList.add('bb-pdp__tab-panel--active');
        });
      });
    }

    /* ===== EVENT BINDING ===== */

    bindEvents() {
      var self = this;

      // Variant option buttons (swatches, selectlike options, size pills, generic buttons)
      this.els.optionGroups.forEach(function (group) {
        var buttons = group.querySelectorAll('[data-option-value]');
        buttons.forEach(function (btn) {
          btn.addEventListener('click', function () {
            self.handleOptionSelect(group, btn);
          });
        });
      });

      // Bundle item selection + per-item variant options
      this.els.bundleItems.forEach(function (item) {
        // Parse per-item variants
        var variantScript = item.querySelector('[data-item-variants]');
        if (variantScript) {
          try {
            item._variants = JSON.parse(variantScript.textContent);
            item._selectedOptions = {};
            var optGroups = item.querySelectorAll('[data-item-option-group]');
            optGroups.forEach(function (grp) {
              var pos = grp.dataset.itemOptionPosition;
              var activeBtn = grp.querySelector('.bb-pdp__item-swatch--active, .bb-pdp__item-pill--active');
              if (activeBtn && pos) {
                item._selectedOptions[pos] = activeBtn.dataset.itemOptionValue;
              }
            });
          } catch (_e) { /* ignore */ }
        }

        // Per-item option buttons
        var itemOptBtns = item.querySelectorAll('[data-item-option-value]');
        itemOptBtns.forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            self.handleItemOptionSelect(item, btn);
          });
        });

        if (item.dataset.available === 'false') return;

        // Click to toggle
        var topRow = item.querySelector('.bb-pdp__bundle-item-top') || item;
        topRow.addEventListener('click', function (e) {
          if (e.target.closest('[data-action]') || e.target.closest('[data-item-option-value]')) return;
          self.toggleBundleItem(item);
        });

        item.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!e.target.closest('[data-action]') && !e.target.closest('[data-item-option-value]')) {
              self.toggleBundleItem(item);
            }
          }
        });

        var minusBtn = item.querySelector('[data-action="decrease"]');
        var plusBtn = item.querySelector('[data-action="increase"]');

        if (minusBtn) {
          minusBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            self.updateItemQuantity(item, -1);
          });
        }
        if (plusBtn) {
          plusBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            self.updateItemQuantity(item, 1);
          });
        }
      });

      // CTA (desktop + mobile sticky)
      if (this.els.cta) {
        this.els.cta.addEventListener('click', function () { self.addToCart(); });
      }
      if (this.els.ctaMobile) {
        this.els.ctaMobile.addEventListener('click', function () { self.addToCart(); });
      }
    }

    /* ===== VARIANT OPTION SELECTION ===== */

    handleOptionSelect(group, btn) {
      var position = group.dataset.optionPosition;
      var value = btn.dataset.optionValue;
      var optionName = (group.dataset.optionName || '').toLowerCase();

      // Remove all active classes from every button in this group
      group.querySelectorAll('[data-option-value]').forEach(function (b) {
        b.classList.remove(
          'bb-pdp__swatch--active',
          'bb-pdp__option-btn--active',
          'bb-pdp__selectlike-option--active',
          'bb-pdp__size-pill--active'
        );
      });

      // Add active to ALL buttons matching this value (syncs desktop + mobile)
      group.querySelectorAll('[data-option-value]').forEach(function (b) {
        if (b.dataset.optionValue === value) {
          if (b.classList.contains('bb-pdp__swatch')) b.classList.add('bb-pdp__swatch--active');
          else if (b.classList.contains('bb-pdp__selectlike-option')) b.classList.add('bb-pdp__selectlike-option--active');
          else if (b.classList.contains('bb-pdp__size-pill')) b.classList.add('bb-pdp__size-pill--active');
          else if (b.classList.contains('bb-pdp__option-btn')) b.classList.add('bb-pdp__option-btn--active');
        }
      });

      // Update displayed selected name
      var nameSpan = group.querySelector('[data-option-selected-name]');
      if (nameSpan) nameSpan.textContent = value;

      // Update selectlike trigger value
      var selectlikeValue = group.querySelector('[data-selectlike-value]');
      if (selectlikeValue) selectlikeValue.textContent = value;

      // Close selectlike dropdown
      var selectlike = group.querySelector('[data-selectlike]');
      if (selectlike) selectlike.classList.remove('bb-pdp__selectlike--open');

      this.selectedOptions[position] = value;
      var matchingVariant = this.findVariant();

      // If no exact match, find the first available variant that has the newly
      // selected option and auto-switch the other options to match.
      if (!matchingVariant) {
        var optionIndex = parseInt(position, 10) - 1;
        for (var i = 0; i < this.variants.length; i++) {
          var v = this.variants[i];
          if (v.available && v.options[optionIndex] === value) {
            matchingVariant = v;
            // Sync all other options to this variant
            var self2 = this;
            var positions = Object.keys(this.selectedOptions);
            for (var j = 0; j < positions.length; j++) {
              var p = positions[j];
              if (p === position) continue;
              var idx = parseInt(p, 10) - 1;
              self2.selectedOptions[p] = v.options[idx];
              // Update the UI for this other option group
              self2.els.optionGroups.forEach(function (g) {
                if (g.dataset.optionPosition !== p) return;
                g.querySelectorAll('[data-option-value]').forEach(function (b) {
                  b.classList.remove('bb-pdp__swatch--active', 'bb-pdp__option-btn--active', 'bb-pdp__selectlike-option--active', 'bb-pdp__size-pill--active');
                  if (b.dataset.optionValue === v.options[idx]) {
                    if (b.classList.contains('bb-pdp__swatch')) b.classList.add('bb-pdp__swatch--active');
                    else if (b.classList.contains('bb-pdp__size-pill')) b.classList.add('bb-pdp__size-pill--active');
                    else if (b.classList.contains('bb-pdp__option-btn')) b.classList.add('bb-pdp__option-btn--active');
                  }
                });
                var nameEl = g.querySelector('[data-option-selected-name]');
                if (nameEl) nameEl.textContent = v.options[idx];
              });
            }
            break;
          }
        }
      }

      if (matchingVariant) {
        // Filter gallery for this variant (color+size combo)
        this.filterMediaByVariant(matchingVariant);

        // Update price display
        this.updatePriceDisplay(matchingVariant);

        // Update main product price and recalculate tier/shipping progress
        this.mainVariantPrice = matchingVariant.price || 0;
        this.recalculate();

        // Dispatch variant change for theme integration
        this.dispatchVariantChange(matchingVariant);

        // Mark unavailable options
        this.updateOptionAvailability();

        // Update URL
        var productUrl = this.section.dataset.productUrl;
        if (productUrl && window.history && window.history.replaceState) {
          window.history.replaceState({}, '', productUrl + '?variant=' + matchingVariant.id);
        }
      }

      // Auto-sync size to bundle items
      if (optionName === 'size') {
        this.syncBundleItemSize(value);
      }
    }

    /**
     * Auto-select a size on the main product by simulating a click.
     */
    autoSelectSize(targetSize) {
      var self = this;
      this.els.optionGroups.forEach(function (group) {
        var name = (group.dataset.optionName || '').toLowerCase();
        if (name !== 'size') return;
        var btn = group.querySelector('[data-option-value="' + targetSize + '"]');
        if (btn && !btn.classList.contains('bb-pdp__size-pill--unavailable')) {
          self.handleOptionSelect(group, btn);
        }
      });
    }

    /**
     * Sync the selected size to all bundle items that have a Size option.
     */
    syncBundleItemSize(sizeValue) {
      var self = this;
      this.els.bundleItems.forEach(function (item) {
        if (!item._variants) return;
        var optGroups = item.querySelectorAll('[data-item-option-group]');
        optGroups.forEach(function (grp) {
          if ((grp.dataset.itemOptionName || '').toLowerCase() !== 'size') return;
          var btn = grp.querySelector('[data-item-option-value="' + sizeValue + '"]');
          if (btn) {
            self.handleItemOptionSelect(item, btn);
          }
        });
      });
    }

    /* ===== PRICE DISPLAY ===== */

    updatePriceDisplay(variant) {
      if (!this.els.priceRegular) return;

      this.els.priceRegular.textContent = Core.formatMoney(variant.price, this.moneyFormat);

      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        if (this.els.priceCompare) {
          this.els.priceCompare.textContent = Core.formatMoney(variant.compare_at_price, this.moneyFormat);
          this.els.priceCompare.style.display = '';
        }
        if (this.els.priceBadge) {
          var pct = Math.round((variant.compare_at_price - variant.price) / variant.compare_at_price * 100);
          this.els.priceBadge.textContent = pct + '% Off';
          this.els.priceBadge.style.display = '';
        }
        if (this.els.priceWrap) this.els.priceWrap.classList.add('bb-pdp__price-wrap--sale');
      } else {
        if (this.els.priceCompare) this.els.priceCompare.style.display = 'none';
        if (this.els.priceBadge) this.els.priceBadge.style.display = 'none';
        if (this.els.priceWrap) this.els.priceWrap.classList.remove('bb-pdp__price-wrap--sale');
      }
    }

    /* ===== SHIPPING PROGRESS BAR ===== */

    updateShippingBar(subtotalCents) {
      if (!this.freeShippingThreshold || this.freeShippingThreshold <= 0) return;
      var thresholdCents = this.freeShippingThreshold * 100;
      if (thresholdCents <= 0) return;
      var pct = Math.min(100, Math.round((subtotalCents / thresholdCents) * 100));
      var unlocked = subtotalCents >= thresholdCents;
      var spanHtml;
      if (unlocked) {
        spanHtml = '<strong>FREE shipping</strong> unlocked!';
      } else {
        var remaining = Core.formatMoney(thresholdCents - subtotalCents, this.moneyFormat);
        spanHtml = 'Spend ' + remaining + ' more for <strong>FREE shipping</strong>';
      }

      // Update desktop shipping bar
      this._syncShippingEl(this.els.shippingBar, this.els.shippingFill, this.els.shippingText, pct, unlocked, spanHtml);
      // Update mobile sticky shipping bar
      this._syncShippingEl(this.els.shippingBarMobile, this.els.shippingFillMobile, this.els.shippingTextMobile, pct, unlocked, spanHtml);
    }

    _syncShippingEl(bar, fill, textEl, pct, unlocked, spanHtml) {
      if (!bar) return;
      if (fill) fill.style.width = pct + '%';
      var span = textEl ? textEl.querySelector('span') : null;
      if (span) span.innerHTML = spanHtml;
      if (unlocked) {
        bar.classList.add('bb-pdp__shipping-bar--unlocked');
      } else {
        bar.classList.remove('bb-pdp__shipping-bar--unlocked');
      }
    }

    _syncCta(btn, canAdd, label) {
      if (!btn) return;
      btn.disabled = !canAdd || this.isLoading;
      if (!this.isLoading) btn.textContent = label;
    }

    /* ===== VARIANT MATCHING ===== */

    dispatchVariantChange(variant) {
      var sectionId = this.section.dataset.sectionId;
      var event = new CustomEvent('optionValueSelectionChange', {
        bubbles: true,
        detail: {
          sectionId: sectionId,
          variant: {
            id: variant.id,
            available: variant.available,
            price: variant.price,
            compare_at_price: variant.compare_at_price,
            featured_media: variant.featured_media_id ? { id: variant.featured_media_id } : null,
          },
        },
      });
      this.section.dispatchEvent(event);
    }

    findVariant() {
      var selectedOptions = this.selectedOptions;
      var positions = Object.keys(selectedOptions);

      for (var i = 0; i < this.variants.length; i++) {
        var variant = this.variants[i];
        var match = true;
        for (var j = 0; j < positions.length; j++) {
          var pos = positions[j];
          var optionIndex = parseInt(pos, 10) - 1;
          if (variant.options[optionIndex] !== selectedOptions[pos]) {
            match = false;
            break;
          }
        }
        if (match) return variant;
      }
      return null;
    }

    updateOptionAvailability() {
      var self = this;
      this.els.optionGroups.forEach(function (group) {
        var pos = group.dataset.optionPosition;
        var optionIndex = parseInt(pos, 10) - 1;
        var buttons = group.querySelectorAll('[data-option-value]');

        buttons.forEach(function (btn) {
          var testValue = btn.dataset.optionValue;
          var available = self.variants.some(function (v) {
            if (v.options[optionIndex] !== testValue) return false;
            var otherPositions = Object.keys(self.selectedOptions);
            for (var k = 0; k < otherPositions.length; k++) {
              var otherPos = otherPositions[k];
              if (otherPos === pos) continue;
              var otherIdx = parseInt(otherPos, 10) - 1;
              if (v.options[otherIdx] !== self.selectedOptions[otherPos]) return false;
            }
            return v.available;
          });

          if (btn.classList.contains('bb-pdp__swatch')) {
            btn.classList.toggle('bb-pdp__swatch--unavailable', !available);
          } else if (btn.classList.contains('bb-pdp__selectlike-option')) {
            btn.classList.toggle('bb-pdp__selectlike-option--unavailable', !available);
          } else if (btn.classList.contains('bb-pdp__size-pill')) {
            btn.classList.toggle('bb-pdp__size-pill--unavailable', !available);
          } else {
            btn.classList.toggle('bb-pdp__option-btn--unavailable', !available);
          }
        });
      });
    }

    /* ===== BUNDLE ITEM VARIANT SELECTION ===== */

    handleItemOptionSelect(item, btn) {
      if (!item._variants || !item._selectedOptions) return;

      var position = btn.dataset.itemOptionPosition;
      var value = btn.dataset.itemOptionValue;
      var group = btn.closest('[data-item-option-group]');

      var isSwatch = btn.classList.contains('bb-pdp__item-swatch');
      var activeClass = isSwatch ? 'bb-pdp__item-swatch--active' : 'bb-pdp__item-pill--active';
      if (group) {
        group.querySelectorAll('[data-item-option-value]').forEach(function (b) {
          b.classList.remove('bb-pdp__item-swatch--active', 'bb-pdp__item-pill--active');
        });
      }
      btn.classList.add(activeClass);

      item._selectedOptions[position] = value;
      var matchingVariant = this.findItemVariant(item);

      if (matchingVariant) {
        var oldVariantId = item.dataset.variantId;
        item.dataset.variantId = String(matchingVariant.id);
        item.dataset.price = String(matchingVariant.price);
        item.dataset.available = String(matchingVariant.available);

        var priceEl = item.querySelector('[data-item-price]');
        if (priceEl) {
          priceEl.textContent = matchingVariant.available
            ? Core.formatMoney(matchingVariant.price, this.moneyFormat)
            : 'Sold out';
        }

        if (matchingVariant.image) {
          var imgEl = item.querySelector('[data-item-image]');
          if (imgEl) imgEl.src = matchingVariant.image;
        }

        // Update selectedProducts map if already selected
        if (this.selectedProducts.has(oldVariantId)) {
          var entry = this.selectedProducts.get(oldVariantId);
          this.selectedProducts.delete(oldVariantId);
          entry.variantId = String(matchingVariant.id);
          entry.price = matchingVariant.price;
          this.selectedProducts.set(entry.variantId, entry);
          this.recalculate();
        }

        if (!matchingVariant.available) {
          item.classList.add('bb-pdp__bundle-item--disabled');
        } else if (item.getAttribute('aria-disabled') !== 'true') {
          item.classList.remove('bb-pdp__bundle-item--disabled');
        }
      }
    }

    findItemVariant(item) {
      if (!item._variants || !item._selectedOptions) return null;
      var selectedOptions = item._selectedOptions;
      var positions = Object.keys(selectedOptions);

      for (var i = 0; i < item._variants.length; i++) {
        var variant = item._variants[i];
        var match = true;
        for (var j = 0; j < positions.length; j++) {
          var pos = positions[j];
          var optionIndex = parseInt(pos, 10) - 1;
          if (variant.options[optionIndex] !== selectedOptions[pos]) {
            match = false;
            break;
          }
        }
        if (match) return variant;
      }
      return null;
    }

    /* ===== BUNDLE ITEM TOGGLE & QUANTITY ===== */

    toggleBundleItem(item) {
      var variantId = item.dataset.variantId;
      if (item.dataset.available === 'false') return;

      if (this.selectedProducts.has(variantId)) {
        this.selectedProducts.delete(variantId);
        item.classList.remove('bb-pdp__bundle-item--selected');
        item.setAttribute('aria-pressed', 'false');
        var qtyEl = item.querySelector('[data-pdp-item-qty]');
        if (qtyEl) qtyEl.style.display = 'none';
      } else {
        var totalItems = this.getTotalItems();
        if (totalItems >= this.maxItems) return;

        this.selectedProducts.set(variantId, {
          productId: item.dataset.productId,
          variantId: variantId,
          title: item.dataset.title,
          price: parseInt(item.dataset.price, 10),
          quantity: 1,
        });
        item.classList.add('bb-pdp__bundle-item--selected');
        item.setAttribute('aria-pressed', 'true');

        var qtyEl2 = item.querySelector('[data-pdp-item-qty]');
        if (qtyEl2) {
          qtyEl2.style.display = 'flex';
          var qtyVal = qtyEl2.querySelector('[data-pdp-qty-value]');
          if (qtyVal) qtyVal.textContent = '1';
        }
      }

      this.recalculate();
    }

    updateItemQuantity(item, delta) {
      var variantId = item.dataset.variantId;
      var entry = this.selectedProducts.get(variantId);
      if (!entry) return;

      var newQty = entry.quantity + delta;
      var totalOther = this.getTotalItems() - entry.quantity;

      if (newQty < 1) {
        this.selectedProducts.delete(variantId);
        item.classList.remove('bb-pdp__bundle-item--selected');
        item.setAttribute('aria-pressed', 'false');
        var qtyEl = item.querySelector('[data-pdp-item-qty]');
        if (qtyEl) qtyEl.style.display = 'none';
      } else if (totalOther + newQty > this.maxItems) {
        return;
      } else {
        entry.quantity = newQty;
      }

      var qtyVal = item.querySelector('[data-pdp-qty-value]');
      if (qtyVal && this.selectedProducts.has(variantId)) {
        qtyVal.textContent = this.selectedProducts.get(variantId).quantity;
      }

      this.recalculate();
    }

    getTotalItems() {
      var total = this.mainVariantPrice > 0 ? 1 : 0;
      this.selectedProducts.forEach(function (item) { total += item.quantity; });
      return total;
    }

    getSubtotal() {
      var subtotal = this.mainVariantPrice || 0;
      this.selectedProducts.forEach(function (item) { subtotal += item.price * item.quantity; });
      return subtotal;
    }

    /* ===== RECALCULATE ===== */

    recalculate() {
      var totalItems = this.getTotalItems();
      var subtotal = this.getSubtotal();
      // Tier value: item count or subtotal in dollars depending on tierMode
      var tierValue = this.tierMode === 'subtotal' ? Math.floor(subtotal / 100) : totalItems;
      var activeTier = Core.getActiveTier(this.tiers, tierValue);
      var activeTierIndex = Core.getActiveTierIndex(this.tiers, tierValue);
      var nextTier = Core.getNextTier(this.tiers, tierValue);
      var discountAmount = Core.calculateDiscount(subtotal, activeTier, this.discountType);
      var total = Math.max(0, subtotal - discountAmount);

      if (this.els.itemCount) this.els.itemCount.textContent = totalItems;

      if (this.els.discount) {
        this.els.discount.textContent = discountAmount > 0 ? '-' + Core.formatMoney(discountAmount, this.moneyFormat) : Core.formatMoney(0, this.moneyFormat);
        var discountRow = this.els.discount.closest('.bb-pdp__summary-row');
        if (discountRow) discountRow.style.display = discountAmount > 0 ? '' : 'none';
      }

      if (this.els.total) this.els.total.textContent = Core.formatMoney(total, this.moneyFormat);

      if (this.els.savings) {
        if (this.showSavings && discountAmount > 0) {
          this.els.savings.removeAttribute('hidden');
          this.els.savings.textContent = 'You save ' + Core.formatMoney(discountAmount, this.moneyFormat) + '!';
        } else {
          this.els.savings.setAttribute('hidden', '');
        }
      }

      // Shipping progress bar
      this.updateShippingBar(subtotal);

      if (this.showTierProgress && this.els.tierSection) {
        this.updateTierProgress(tierValue, activeTier, activeTierIndex, nextTier);
      }

      // Tier notification
      if (activeTierIndex > this.previousTierIndex && this.previousTierIndex >= 0) {
        var notifText = activeTier.reward
          ? activeTier.reward + ' unlocked!'
          : activeTier.label
            ? activeTier.label + ' unlocked!'
            : 'New reward unlocked!';
        this.showNotification(notifText);
      }
      var previousTierIndex = this.previousTierIndex;
      this.previousTierIndex = activeTierIndex;

      // Free gifts
      this.manageFreeGifts(activeTierIndex, previousTierIndex);

      // Max items dim
      var self = this;
      this.els.bundleItems.forEach(function (item) {
        if (totalItems >= self.maxItems && !self.selectedProducts.has(item.dataset.variantId)) {
          item.classList.add('bb-pdp__bundle-item--disabled');
        } else if (item.dataset.available !== 'false') {
          item.classList.remove('bb-pdp__bundle-item--disabled');
        }
      });

      // Quantity button states
      this.els.bundleItems.forEach(function (item) {
        var variantId = item.dataset.variantId;
        var entry = self.selectedProducts.get(variantId);
        var minusBtn = item.querySelector('[data-action="decrease"]');
        var plusBtn = item.querySelector('[data-action="increase"]');

        if (minusBtn) minusBtn.disabled = !entry || entry.quantity <= 1;
        if (plusBtn) {
          var totalOther = self.getTotalItems() - (entry ? entry.quantity : 0);
          plusBtn.disabled = !entry || (totalOther + entry.quantity >= self.maxItems);
        }
      });

      // CTA — main product alone is always buyable
      var canAdd = totalItems > 0;
      var ctaLabel = this.ctaText;
      if (!this.isLoading && canAdd && total > 0) {
        ctaLabel = this.ctaText + ' \u2014 ' + Core.formatMoney(total, this.moneyFormat);
      }
      this._syncCta(this.els.cta, canAdd, ctaLabel);
      this._syncCta(this.els.ctaMobile, canAdd, ctaLabel);
    }

    /* ===== STICKY MOBILE CTA ===== */

    initStickyMobile() {
      // Move notification to body so position:fixed works regardless of ancestor transforms
      if (this.els.notification) {
        document.body.appendChild(this.els.notification);
      }

      var stickyEl = this.section.querySelector('.bb-pdp__sticky-mobile');
      if (!stickyEl) return;
      this._stickyEl = stickyEl;
      this._stickyOriginalParent = stickyEl.parentNode;
      this._stickyOriginalNext = stickyEl.nextSibling;

      var self = this;
      var mql = window.matchMedia('(max-width: 767px)');

      function handleMobileChange(e) {
        if (e.matches) {
          // Mobile — move to body so position:fixed works
          document.body.appendChild(stickyEl);
          stickyEl.classList.add('bb-pdp__sticky-mobile--active');
        } else {
          // Desktop — move back and hide
          stickyEl.classList.remove('bb-pdp__sticky-mobile--active');
          if (self._stickyOriginalNext) {
            self._stickyOriginalParent.insertBefore(stickyEl, self._stickyOriginalNext);
          } else {
            self._stickyOriginalParent.appendChild(stickyEl);
          }
        }
      }

      mql.addEventListener('change', handleMobileChange);
      handleMobileChange(mql);
    }

    /* ===== TIER CARDS INIT ===== */

    initTierCards() {
      if (!this.els.tierCards || !this.els.tierDots || this.tiers.length === 0) return;
      var totalTiers = this.tiers.length;

      // Render milestone dots
      var dotsHtml = '';
      for (var i = 0; i < totalTiers; i++) {
        var leftPos = ((i + 0.5) / totalTiers) * 100;
        dotsHtml += '<div class="bb-pdp__tier-dot" data-tier-dot="' + i + '" style="left:' + leftPos + '%"></div>';
      }
      this.els.tierDots.innerHTML = dotsHtml;

      // Render reward cards
      var cardsHtml = '';
      for (var j = 0; j < totalTiers; j++) {
        var tier = this.tiers[j];
        var label = tier.label || (tier.count + '+ Items');
        var reward = tier.reward || tier.label || '';
        var giftImage = tier.giftImage || '';
        var valueBadge = tier.valueBadge || '';
        var hasGiftVariant = tier.freeGiftVariantIds && tier.freeGiftVariantIds.length > 0;

        cardsHtml += '<div class="bb-pdp__tier-card" data-tier-card="' + j + '">';

        // Value badge
        if (valueBadge) {
          cardsHtml += '<div class="bb-pdp__tier-card-badge">' + this._badgeLines(valueBadge) + '</div>';
        }

        // Threshold label
        cardsHtml += '<span class="bb-pdp__tier-card-threshold">' + label + '</span>';

        // Icon — priority: 1) manual giftImage, 2) auto-fetch from free gift variant, 3) gift box SVG
        if (giftImage) {
          cardsHtml += '<div class="bb-pdp__tier-card-icon bb-pdp__tier-card-icon--has-image"><img src="' + giftImage + '" alt="" width="68" height="68" loading="lazy"></div>';
        } else if (hasGiftVariant) {
          // Placeholder — will be replaced with product image once fetched
          cardsHtml += '<div class="bb-pdp__tier-card-icon bb-pdp__tier-card-icon--has-image" data-tier-icon="' + j + '">' + this._giftBoxSvg() + '</div>';
        } else {
          cardsHtml += '<div class="bb-pdp__tier-card-icon">' + this._giftBoxSvg() + '</div>';
        }

        // Reward text
        if (reward) {
          cardsHtml += '<span class="bb-pdp__tier-card-reward">' + reward + '</span>';
        }

        cardsHtml += '</div>';
      }
      this.els.tierCards.innerHTML = cardsHtml;

      // Auto-fetch free gift product images for tiers without a manual giftImage
      this._fetchGiftImages();
    }

    _fetchGiftImages() {
      var self = this;
      var root = Core.routeRoot();
      this.tiers.forEach(function (tier, idx) {
        if (tier.giftImage) return; // manual image already set
        var giftIds = tier.freeGiftVariantIds || [];
        if (giftIds.length === 0) return;

        var numericId = Core.numericVariantId(giftIds[0]);
        fetch(root + 'variants/' + numericId + '.js', { credentials: 'same-origin' })
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (variant) {
            if (!variant) return;
            var imgUrl = (variant.featured_image && variant.featured_image.src)
              || (variant.image)
              || '';
            if (!imgUrl) return;

            var iconEl = self.els.tierCards.querySelector('[data-tier-icon="' + idx + '"]');
            if (iconEl) {
              iconEl.innerHTML = '<img src="' + imgUrl + '" alt="' + (variant.title || 'Free gift') + '" width="68" height="68" loading="lazy">';
            }
          })
          .catch(function () { /* keep gift box SVG fallback */ });
      });
    }

    _badgeLines(text) {
      return text;
    }

    _giftBoxSvg() {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>';
    }

    /* ===== TIER PROGRESS UPDATE ===== */

    updateTierProgress(tierValue, activeTier, activeTierIndex, nextTier) {
      if (!this.els.tierFill || !this.els.tierLabel) return;
      var totalTiers = this.tiers.length;
      if (totalTiers === 0) return;
      var isSubtotal = this.tierMode === 'subtotal';

      // Progress bar — fill extends to the center of the last unlocked tier's dot
      var lastUnlockedIdx = -1;
      for (var i = 0; i < totalTiers; i++) {
        if (tierValue >= this.tiers[i].count) lastUnlockedIdx = i;
      }
      var progressWidth = lastUnlockedIdx >= 0 ? ((lastUnlockedIdx + 0.5) / totalTiers) * 100 : 0;
      this.els.tierFill.style.width = progressWidth + '%';

      // Update milestone dots
      var dots = this.els.tierDots ? this.els.tierDots.querySelectorAll('.bb-pdp__tier-dot') : [];
      for (var d = 0; d < dots.length; d++) {
        if (tierValue >= this.tiers[d].count) {
          dots[d].classList.add('bb-pdp__tier-dot--active');
        } else {
          dots[d].classList.remove('bb-pdp__tier-dot--active');
        }
      }

      // Update card unlock states
      var cards = this.els.tierCards ? this.els.tierCards.querySelectorAll('.bb-pdp__tier-card') : [];
      for (var c = 0; c < cards.length; c++) {
        if (tierValue >= this.tiers[c].count) {
          cards[c].classList.add('bb-pdp__tier-card--unlocked');
        } else {
          cards[c].classList.remove('bb-pdp__tier-card--unlocked');
        }
      }

      // Progress label text
      if (tierValue === 0) {
        this.els.tierLabel.textContent = 'Add products to unlock free gifts';
      } else if (nextTier) {
        var needed = nextTier.count - tierValue;
        var nextName = nextTier.reward || nextTier.label || 'next reward';
        if (isSubtotal) {
          this.els.tierLabel.textContent = 'Spend $' + needed + ' more to unlock ' + nextName + '!';
        } else {
          var itemWord = needed === 1 ? 'item' : 'items';
          this.els.tierLabel.textContent = 'Add ' + needed + ' more ' + itemWord + ' to unlock ' + nextName + '!';
        }
      } else {
        this.els.tierLabel.textContent = 'All rewards unlocked!';
      }

      // Callout banner — show unlocked rewards
      if (this.els.tierCallout && this.els.tierCalloutText) {
        if (lastUnlockedIdx >= 0 && this.getTotalItems() > 0) {
          var rewardTexts = [];
          for (var r = 0; r <= lastUnlockedIdx; r++) {
            var rText = this.tiers[r].reward || this.tiers[r].label || '';
            if (rText) rewardTexts.push(rText);
          }
          if (rewardTexts.length > 0) {
            this.els.tierCalloutText.textContent = "You've unlocked " + rewardTexts.join(' + ') + '!';
            this.els.tierCallout.style.display = '';
          } else {
            this.els.tierCallout.style.display = 'none';
          }
        } else {
          this.els.tierCallout.style.display = 'none';
        }
      }
    }

    /* ===== FREE GIFTS ===== */

    /**
     * Find the minimum tier count needed to unlock a specific gift variant.
     * Used for _bundle_gift_min_items cart property.
     */
    _getMinItemsForGift(giftVariantId) {
      for (var i = 0; i < this.tiers.length; i++) {
        var giftIds = this.tiers[i].freeGiftVariantIds || [];
        for (var j = 0; j < giftIds.length; j++) {
          if (giftIds[j] === giftVariantId) return this.tiers[i].count;
        }
      }
      // Fallback: use the first tier's count
      return this.tiers.length > 0 ? this.tiers[0].count : 1;
    }

    manageFreeGifts(activeTierIndex, previousTierIndex) {
      if (this.freeGiftPending) return;
      var self = this;

      var targetGiftIds = Core.getTargetGiftIds(this.tiers, activeTierIndex);
      var targetSet = {};
      for (var i = 0; i < targetGiftIds.length; i++) targetSet[targetGiftIds[i]] = true;

      var toRemove = [];
      var toAdd = [];

      this.activeFreeGifts.forEach(function (_val, key) {
        if (!targetSet[key]) toRemove.push(key);
      });

      for (var j = 0; j < targetGiftIds.length; j++) {
        if (!this.activeFreeGifts.has(targetGiftIds[j])) toAdd.push(targetGiftIds[j]);
      }

      if (toAdd.length === 0 && toRemove.length === 0) return;

      this.freeGiftPending = true;
      var operation = Promise.resolve();

      toRemove.forEach(function (id) {
        operation = operation.then(function () {
          return Core.removeFreeGiftFromCart(id, self.bundleId);
        }).then(function () {
          self.activeFreeGifts.delete(id);
        });
      });

      toAdd.forEach(function (id) {
        var minItems = self._getMinItemsForGift(id);
        operation = operation.then(function () {
          return Core.addFreeGiftToCart(id, self.bundleId, self.bundleName, minItems);
        }).then(function (result) {
          if (result && result.added) self.activeFreeGifts.set(id, true);
          if (result && result.reason === 'unavailable') self.showNotification('Free gift is currently unavailable');
        });
      });

      if (toAdd.length > 0) {
        operation = operation.then(function () {
          self.showNotification('Free gift added to your cart!');
        });
      }

      operation
        .then(function () { self.freeGiftPending = false; })
        .catch(function () { self.freeGiftPending = false; });
    }

    /* ===== NOTIFICATION ===== */

    showNotification(message) {
      if (!this.els.notification) return;
      if (this.notificationTimeout) clearTimeout(this.notificationTimeout);

      this.els.notification.textContent = message;
      this.els.notification.classList.add('bb-pdp__notification--visible');

      var self = this;
      this.notificationTimeout = setTimeout(function () {
        self.els.notification.classList.remove('bb-pdp__notification--visible');
        self.notificationTimeout = null;
      }, 3000);
    }

    /* ===== ADD TO CART ===== */

    async addToCart() {
      if (this.isLoading) return;
      if (!this.els.cta && !this.els.ctaMobile) return;

      var self = this;
      var allCtas = [this.els.cta, this.els.ctaMobile].filter(Boolean);
      this.isLoading = true;
      this.isRedirecting = false;
      allCtas.forEach(function (b) { b.disabled = true; b.classList.add('bb-pdp__cta--loading'); });

      var totalItems = this.getTotalItems();
      var subtotal = this.getSubtotal();
      var tierValue = this.tierMode === 'subtotal' ? Math.floor(subtotal / 100) : totalItems;
      var activeTier = Core.getActiveTier(this.tiers, tierValue);
      var items = [];
      var bundleId = this.bundleId;
      var bundleName = this.bundleName;
      var discountType = this.discountType;
      var tierLabel = activeTier && activeTier.label ? activeTier.label : '';
      var hasBundleItems = this.selectedProducts.size > 0;

      // Always add the main product variant
      var mainVariant = this.findVariant();
      if (mainVariant) {
        var mainItem = {
          id: parseInt(mainVariant.id, 10),
          quantity: 1,
          properties: {},
        };
        if (hasBundleItems) {
          mainItem.properties['_bundle_id'] = bundleId;
          mainItem.properties['_bundle_name'] = bundleName;
          mainItem.properties['_bundle_size'] = String(totalItems);
          if (activeTier) {
            mainItem.properties['_bundle_discount'] = String(activeTier.discount);
            mainItem.properties['_bundle_discount_type'] = discountType;
          }
          if (tierLabel) mainItem.properties['_bundle_tier'] = tierLabel;
        }
        items.push(mainItem);
      }

      // Add bundle items
      this.selectedProducts.forEach(function (entry) {
        var lineItem = {
          id: parseInt(entry.variantId, 10),
          quantity: entry.quantity,
          properties: {
            '_bundle_id': bundleId,
            '_bundle_name': bundleName,
            '_bundle_size': String(totalItems),
          },
        };
        if (activeTier) {
          lineItem.properties['_bundle_discount'] = String(activeTier.discount);
          lineItem.properties['_bundle_discount_type'] = discountType;
        }
        if (tierLabel) lineItem.properties['_bundle_tier'] = tierLabel;
        items.push(lineItem);
      });

      try {
        // Check for multi-variant free gifts that need user selection
        var activeTierIndex = Core.getActiveTierIndex(this.tiers, tierValue);
        var giftVariantIds = Core.getTargetGiftIds(this.tiers, activeTierIndex);

        if (giftVariantIds.length > 0 && !this.cartRedirect) {
          var multiVariantGifts = await this.resolveGiftProducts(giftVariantIds, activeTierIndex);
          if (multiVariantGifts.length > 0) {
            // Show modal for user to pick options
            var selectedGiftVariants = await this.showGiftSelectionModal(multiVariantGifts);
            if (!selectedGiftVariants) {
              // User cancelled
              allCtas.forEach(function (b) { b.classList.remove('bb-pdp__cta--loading'); });
              this.isLoading = false;
              allCtas.forEach(function (b) { b.disabled = false; });
              return;
            }
            // Add bundle items first
            await Core.addBundleToCart(items);
            // Add selected gift variants
            for (var gi = 0; gi < selectedGiftVariants.length; gi++) {
              var gift = selectedGiftVariants[gi];
              await Core.addFreeGiftToCart(gift.variantId, bundleId, bundleName, gift.minItems);
              self.activeFreeGifts.set(String(gift.variantId), true);
            }
            Core.openCartDrawer();
            allCtas.forEach(function (b) {
              b.textContent = 'Added to Cart!';
              b.classList.remove('bb-pdp__cta--loading');
              b.classList.add('bb-pdp__cta--success');
            });
            setTimeout(function () {
              allCtas.forEach(function (b) { b.classList.remove('bb-pdp__cta--success'); });
              self.recalculate();
            }, 2000);
            return;
          }
        }

        await Core.addBundleToCart(items);

        if (this.cartRedirect) {
          this.isRedirecting = true;
          window.location.href = Core.routeRoot() + 'cart';
          return;
        }

        // Open cart drawer with fresh content
        Core.openCartDrawer();

        allCtas.forEach(function (b) {
          b.textContent = 'Added to Cart!';
          b.classList.remove('bb-pdp__cta--loading');
          b.classList.add('bb-pdp__cta--success');
        });

        setTimeout(function () {
          allCtas.forEach(function (b) { b.classList.remove('bb-pdp__cta--success'); });
          self.recalculate();
        }, 2000);
      } catch (err) {
        console.error('[BundlePDP] Cart error:', err);
        allCtas.forEach(function (b) {
          b.textContent = 'Error \u2014 Try Again';
          b.classList.remove('bb-pdp__cta--loading');
        });
        setTimeout(function () { self.recalculate(); }, 3000);
      } finally {
        if (!this.isRedirecting) {
          this.isLoading = false;
          allCtas.forEach(function (b) { b.disabled = false; });
        }
      }
    }

    /* ===== FREE GIFT MODAL ===== */

    /**
     * Resolve gift variant IDs to full product data, filtering to multi-variant gifts only.
     */
    async resolveGiftProducts(giftVariantIds, activeTierIndex) {
      var results = [];
      var self = this;
      for (var i = 0; i < giftVariantIds.length; i++) {
        var gid = giftVariantIds[i];
        var data = await Core.fetchProductForVariant(gid);
        if (data && data.variants.length > 1) {
          results.push({
            product: data.product,
            variants: data.variants,
            options: data.options,
            originalVariantId: gid,
            minItems: self._getMinItemsForGift(gid),
          });
        }
      }
      return results;
    }

    /**
     * Show a modal for the user to pick color/size on multi-variant free gifts.
     * Returns a Promise that resolves with selected variant info, or null if cancelled.
     */
    showGiftSelectionModal(gifts) {
      var self = this;
      return new Promise(function (resolve) {
        // Build modal DOM
        var overlay = document.createElement('div');
        overlay.className = 'bb-pdp__gift-modal-overlay';

        var modal = document.createElement('div');
        modal.className = 'bb-pdp__gift-modal';

        var closeBtn = document.createElement('button');
        closeBtn.className = 'bb-pdp__gift-modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Close');
        modal.appendChild(closeBtn);

        var title = document.createElement('h3');
        title.className = 'bb-pdp__gift-modal-title';
        title.textContent = 'Select Your Free Gift Options';
        modal.appendChild(title);

        // Track selections per gift
        var giftSelections = [];

        gifts.forEach(function (gift, idx) {
          var itemEl = document.createElement('div');
          itemEl.className = 'bb-pdp__gift-modal-item';
          itemEl.dataset.giftIdx = idx;

          // Header with image + title
          var header = document.createElement('div');
          header.className = 'bb-pdp__gift-modal-item-header';

          if (gift.product.featured_image) {
            var img = document.createElement('img');
            img.className = 'bb-pdp__gift-modal-item-image';
            img.src = gift.product.featured_image;
            img.alt = gift.product.title;
            header.appendChild(img);
          }

          var infoDiv = document.createElement('div');
          var titleDiv = document.createElement('div');
          titleDiv.className = 'bb-pdp__gift-modal-item-title';
          titleDiv.textContent = gift.product.title;
          infoDiv.appendChild(titleDiv);

          var badge = document.createElement('div');
          badge.className = 'bb-pdp__gift-modal-item-badge';
          badge.textContent = 'FREE';
          infoDiv.appendChild(badge);
          header.appendChild(infoDiv);
          itemEl.appendChild(header);

          // Init selection state for this gift
          var selection = { selectedOptions: {}, variants: gift.variants };
          giftSelections.push(selection);

          // Option groups — rendered as dropdowns
          gift.options.forEach(function (opt) {
            var optName = opt.name.toLowerCase();
            var groupEl = document.createElement('div');
            groupEl.className = 'bb-pdp__gift-modal-option-group';
            groupEl.dataset.optionName = optName;

            var label = document.createElement('label');
            label.textContent = opt.name;
            groupEl.appendChild(label);

            var select = document.createElement('select');
            select.className = 'bb-pdp__gift-modal-select';
            select.dataset.giftIdx = idx;
            select.dataset.optionPosition = String(opt.position);

            var placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Select ' + opt.name + '...';
            placeholder.disabled = true;
            placeholder.selected = true;
            select.appendChild(placeholder);

            opt.values.forEach(function (val) {
              var option = document.createElement('option');
              option.value = val;
              option.textContent = val;
              select.appendChild(option);
            });

            groupEl.appendChild(select);
            itemEl.appendChild(groupEl);
          });

          modal.appendChild(itemEl);
        });

        // Confirm button
        var confirmBtn = document.createElement('button');
        confirmBtn.className = 'bb-pdp__gift-modal-confirm bb-pdp__cta';
        confirmBtn.textContent = 'Confirm & Add to Cart';
        confirmBtn.disabled = true;
        modal.appendChild(confirmBtn);

        // Skip link
        var skipBtn = document.createElement('button');
        skipBtn.className = 'bb-pdp__gift-modal-skip';
        skipBtn.textContent = 'Skip — use default options';
        modal.appendChild(skipBtn);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Check if all gifts have all options selected
        function checkComplete() {
          var allComplete = true;
          for (var i = 0; i < gifts.length; i++) {
            var optCount = gifts[i].options.length;
            var selCount = Object.keys(giftSelections[i].selectedOptions).length;
            if (selCount < optCount) { allComplete = false; break; }
          }
          confirmBtn.disabled = !allComplete;
        }

        // Find matching variant for a gift selection
        function findGiftVariant(giftIdx) {
          var sel = giftSelections[giftIdx];
          var variants = sel.variants;
          var positions = Object.keys(sel.selectedOptions);
          for (var i = 0; i < variants.length; i++) {
            var v = variants[i];
            var match = true;
            for (var j = 0; j < positions.length; j++) {
              var pos = positions[j];
              var optIdx = parseInt(pos, 10) - 1;
              // Storefront API uses options array (0-indexed option values mapped to option1/option2/option3)
              var variantOptionVal = v['option' + (optIdx + 1)] || (v.options && v.options[optIdx]);
              if (variantOptionVal !== sel.selectedOptions[pos]) { match = false; break; }
            }
            if (match) return v;
          }
          return null;
        }

        // Dropdown change handler
        modal.addEventListener('change', function (e) {
          var select = e.target.closest('.bb-pdp__gift-modal-select');
          if (!select) return;
          var gIdx = parseInt(select.dataset.giftIdx, 10);
          var pos = select.dataset.optionPosition;
          var val = select.value;
          if (val) {
            giftSelections[gIdx].selectedOptions[pos] = val;
          }
          checkComplete();
        });

        // Close / Cancel
        function cleanup() {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }

        closeBtn.addEventListener('click', function () {
          cleanup();
          resolve(null);
        });

        overlay.addEventListener('click', function (e) {
          if (e.target === overlay) {
            cleanup();
            resolve(null);
          }
        });

        // Skip — use default (original) variant IDs
        skipBtn.addEventListener('click', function () {
          cleanup();
          var defaults = gifts.map(function (g) {
            return {
              variantId: Core.numericVariantId(g.originalVariantId),
              minItems: g.minItems,
            };
          });
          resolve(defaults);
        });

        // Confirm — use selected variants
        confirmBtn.addEventListener('click', function () {
          cleanup();
          var selected = [];
          for (var i = 0; i < gifts.length; i++) {
            var matchedVariant = findGiftVariant(i);
            if (matchedVariant) {
              selected.push({
                variantId: matchedVariant.id,
                minItems: gifts[i].minItems,
              });
            } else {
              // Fallback to original
              selected.push({
                variantId: Core.numericVariantId(gifts[i].originalVariantId),
                minItems: gifts[i].minItems,
              });
            }
          }
          resolve(selected);
        });

        // Escape key
        function handleEsc(e) {
          if (e.key === 'Escape') {
            document.removeEventListener('keydown', handleEsc);
            cleanup();
            resolve(null);
          }
        }
        document.addEventListener('keydown', handleEsc);
      });
    }
  }

  /* ===== INIT ===== */

  function init() {
    document.querySelectorAll('[data-bundle-pdp]').forEach(function (el) {
      if (!instances.has(el)) {
        instances.set(el, new BundlePDP(el));
      }
    });
  }

  document.addEventListener('shopify:section:load', init);
  document.addEventListener('shopify:section:select', init);
  document.addEventListener('shopify:block:select', function (e) {
    var target = e.target.querySelector('[data-bundle-pdp]');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
