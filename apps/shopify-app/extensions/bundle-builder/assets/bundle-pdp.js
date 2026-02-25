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

      var metafieldConfig = Core.parseMetafieldConfig(section.dataset.metafieldConfig);

      this.tiers = metafieldConfig ? metafieldConfig.tiers : Core.parseTiers(section.dataset.tiers);
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

      // Parse product variants
      this.variants = [];
      this.selectedOptions = {};
      var variantScript = section.querySelector('[data-pdp-variants]');
      if (variantScript) {
        try { this.variants = JSON.parse(variantScript.textContent); } catch (_e) { /* ignore */ }
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

      this.initGallery();
      this.initSelectlike();
      this.initTabs();
      this.initTierCards();
      this.bindEvents();
      this.recalculate();
    }

    /* ===== GALLERY ===== */

    initGallery() {
      if (!this.els.slider) return;
      var self = this;

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

    filterMediaByColor(colorName) {
      if (!this.els.slider || !this.els.thumbsContainer) return;
      var self = this;

      // Disconnect observer before changing visibility
      if (this._slideObserver) {
        this.els.slider.querySelectorAll('.bb-pdp__slide').forEach(function (slide) {
          self._slideObserver.unobserve(slide);
        });
      }

      // Check if any media are tagged with this color
      var slides = this.els.slider.querySelectorAll('.bb-pdp__slide');
      var hasColorMedia = false;
      slides.forEach(function (slide) {
        if (slide.dataset.mediaColor === colorName) {
          hasColorMedia = true;
        }
      });

      // Theme logic: if color-tagged media exist, show ONLY those.
      // If no color-tagged media exist for this color, show ALL media.
      slides.forEach(function (slide) {
        if (!hasColorMedia) {
          slide.style.display = '';
        } else if (slide.dataset.mediaColor === colorName) {
          slide.style.display = '';
        } else {
          slide.style.display = 'none';
        }
      });

      var thumbs = this.els.thumbsContainer.querySelectorAll('.bb-pdp__thumb');
      thumbs.forEach(function (thumb) {
        if (!hasColorMedia) {
          thumb.style.display = '';
        } else if (thumb.dataset.mediaColor === colorName) {
          thumb.style.display = '';
        } else {
          thumb.style.display = 'none';
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

      // Go to first visible slide
      var firstVisible = this.getVisibleSlides()[0];
      if (firstVisible) {
        var idx = parseInt(firstVisible.dataset.slideIndex, 10);
        // Instant scroll (no smooth) for color change
        firstVisible.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'start' });
        this.onSlideChange(idx);
      }
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

      // CTA
      if (this.els.cta) {
        this.els.cta.addEventListener('click', function () { self.addToCart(); });
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

      if (matchingVariant) {
        // Filter gallery if color changed
        if (optionName === 'color' || optionName === 'colour' || optionName === 'colors') {
          this.filterMediaByColor(value);
        }

        // Update price display
        this.updatePriceDisplay(matchingVariant);

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
      var total = 0;
      this.selectedProducts.forEach(function (item) { total += item.quantity; });
      return total;
    }

    getSubtotal() {
      var subtotal = 0;
      this.selectedProducts.forEach(function (item) { subtotal += item.price * item.quantity; });
      return subtotal;
    }

    /* ===== RECALCULATE ===== */

    recalculate() {
      var totalItems = this.getTotalItems();
      var subtotal = this.getSubtotal();
      var activeTier = Core.getActiveTier(this.tiers, totalItems);
      var activeTierIndex = Core.getActiveTierIndex(this.tiers, totalItems);
      var nextTier = Core.getNextTier(this.tiers, totalItems);
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

      if (this.showTierProgress && this.els.tierSection) {
        this.updateTierProgress(totalItems, activeTier, activeTierIndex, nextTier);
      }

      // Tier notification
      if (activeTierIndex > this.previousTierIndex && this.previousTierIndex >= 0) {
        this.showNotification(
          activeTier.label
            ? activeTier.label + ' unlocked!'
            : 'Discount unlocked: ' + activeTier.discount + (this.discountType === 'percentage' ? '% off' : ' off')
        );
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

      // CTA
      if (this.els.cta) {
        var canAdd = totalItems >= this.minItems && totalItems > 0;
        this.els.cta.disabled = !canAdd || this.isLoading;

        if (!this.isLoading) {
          if (canAdd && total > 0) {
            this.els.cta.textContent = this.ctaText + ' \u2014 ' + Core.formatMoney(total, this.moneyFormat);
          } else {
            this.els.cta.textContent = this.ctaText;
          }
        }
      }
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
          cardsHtml += '<div class="bb-pdp__tier-card-icon bb-pdp__tier-card-icon--has-image"><img src="' + giftImage + '" alt="" width="48" height="48" loading="lazy"></div>';
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
      this.tiers.forEach(function (tier, idx) {
        if (tier.giftImage) return; // manual image already set
        var giftIds = tier.freeGiftVariantIds || [];
        if (giftIds.length === 0) return;

        var numericId = Core.numericVariantId(giftIds[0]);
        fetch('/variants/' + numericId + '.js')
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (variant) {
            if (!variant) return;
            var imgUrl = (variant.featured_image && variant.featured_image.src)
              || (variant.image)
              || '';
            if (!imgUrl) return;

            var iconEl = self.els.tierCards.querySelector('[data-tier-icon="' + idx + '"]');
            if (iconEl) {
              iconEl.innerHTML = '<img src="' + imgUrl + '" alt="' + (variant.title || 'Free gift') + '" width="48" height="48" loading="lazy">';
            }
          })
          .catch(function () { /* keep gift box SVG fallback */ });
      });
    }

    _badgeLines(text) {
      var words = text.split(' ');
      var html = '';
      for (var i = 0; i < words.length; i++) html += '<div>' + words[i] + '</div>';
      return html;
    }

    _giftBoxSvg() {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>';
    }

    /* ===== TIER PROGRESS UPDATE ===== */

    updateTierProgress(totalItems, activeTier, activeTierIndex, nextTier) {
      if (!this.els.tierFill || !this.els.tierLabel) return;
      var totalTiers = this.tiers.length;
      if (totalTiers === 0) return;

      // Progress bar — fill extends to the center of the last unlocked tier's dot
      var lastUnlockedIdx = -1;
      for (var i = 0; i < totalTiers; i++) {
        if (totalItems >= this.tiers[i].count) lastUnlockedIdx = i;
      }
      var progressWidth = lastUnlockedIdx >= 0 ? ((lastUnlockedIdx + 0.5) / totalTiers) * 100 : 0;
      this.els.tierFill.style.width = progressWidth + '%';

      // Update milestone dots
      var dots = this.els.tierDots ? this.els.tierDots.querySelectorAll('.bb-pdp__tier-dot') : [];
      for (var d = 0; d < dots.length; d++) {
        if (totalItems >= this.tiers[d].count) {
          dots[d].classList.add('bb-pdp__tier-dot--active');
        } else {
          dots[d].classList.remove('bb-pdp__tier-dot--active');
        }
      }

      // Update card unlock states
      var cards = this.els.tierCards ? this.els.tierCards.querySelectorAll('.bb-pdp__tier-card') : [];
      for (var c = 0; c < cards.length; c++) {
        if (totalItems >= this.tiers[c].count) {
          cards[c].classList.add('bb-pdp__tier-card--unlocked');
        } else {
          cards[c].classList.remove('bb-pdp__tier-card--unlocked');
        }
      }

      // Progress label text
      if (totalItems === 0) {
        this.els.tierLabel.textContent = 'Add products to unlock free gifts';
      } else if (nextTier) {
        var needed = nextTier.count - totalItems;
        var itemWord = needed === 1 ? 'item' : 'items';
        var nextName = nextTier.reward || nextTier.label || 'next reward';
        this.els.tierLabel.textContent = 'Add ' + needed + ' more ' + itemWord + ' to unlock ' + nextName + '!';
      } else {
        this.els.tierLabel.textContent = 'All rewards unlocked!';
      }

      // Callout banner — show unlocked rewards
      if (this.els.tierCallout && this.els.tierCalloutText) {
        if (lastUnlockedIdx >= 0 && totalItems > 0) {
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
        operation = operation.then(function () {
          return Core.addFreeGiftToCart(id, self.bundleId, self.bundleName);
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
      if (this.isLoading || this.selectedProducts.size === 0) return;
      if (!this.els.cta) return;
      if (this.getTotalItems() < this.minItems) return;

      var self = this;
      this.isLoading = true;
      this.isRedirecting = false;
      this.els.cta.disabled = true;
      this.els.cta.classList.add('bb-pdp__cta--loading');

      var activeTier = Core.getActiveTier(this.tiers, this.getTotalItems());
      var items = [];
      var bundleId = this.bundleId;
      var bundleName = this.bundleName;
      var discountType = this.discountType;
      var tierLabel = activeTier && activeTier.label ? activeTier.label : '';
      var totalItems = this.getTotalItems();

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
        await Core.addBundleToCart(items);

        if (this.cartRedirect) {
          this.isRedirecting = true;
          window.location.href = '/cart';
          return;
        }

        this.els.cta.textContent = 'Added to Cart!';
        this.els.cta.classList.remove('bb-pdp__cta--loading');
        this.els.cta.classList.add('bb-pdp__cta--success');

        setTimeout(function () {
          self.els.cta.classList.remove('bb-pdp__cta--success');
          self.recalculate();
        }, 2000);
      } catch (err) {
        console.error('[BundlePDP] Cart error:', err);
        if (this.els.cta) {
          this.els.cta.textContent = 'Error \u2014 Try Again';
          this.els.cta.classList.remove('bb-pdp__cta--loading');
        }
        setTimeout(function () { self.recalculate(); }, 3000);
      } finally {
        if (!this.isRedirecting) {
          this.isLoading = false;
          if (this.els.cta) this.els.cta.disabled = false;
        }
      }
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
