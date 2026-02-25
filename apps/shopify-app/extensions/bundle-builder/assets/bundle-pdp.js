/**
 * Bundle PDP — Product page layout with image gallery + bundle builder.
 * Uses BundleCore for shared pricing, tier, cart, and free gift logic.
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
      this.activeThumbIndex = 0;
      this.imageCount = 0;
      this.touchStartX = 0;
      this.touchStartY = 0;
      this.isSwiping = false;

      // Parse product variants for option selection
      this.variants = [];
      this.selectedOptions = {};
      var variantScript = section.querySelector('[data-pdp-variants]');
      if (variantScript) {
        try { this.variants = JSON.parse(variantScript.textContent); } catch (_e) { /* ignore */ }
      }

      this.els = {
        mainImage: section.querySelector('[data-pdp-main-img]'),
        mainImageWrap: section.querySelector('[data-pdp-main-image]'),
        mainImageContainer: section.querySelector('.bb-pdp__main-image-container'),
        thumbs: section.querySelectorAll('[data-pdp-thumb]'),
        dots: section.querySelectorAll('[data-pdp-dot]'),
        prevArrow: section.querySelector('[data-pdp-arrow="prev"]'),
        nextArrow: section.querySelector('[data-pdp-arrow="next"]'),
        optionGroups: section.querySelectorAll('[data-option-group]'),
        priceEl: section.querySelector('[data-pdp-price]'),
        comparePriceEl: section.querySelector('[data-pdp-compare-price]'),
        tierSection: section.querySelector('[data-pdp-tier]'),
        tierLabel: section.querySelector('[data-pdp-tier-label]'),
        tierFill: section.querySelector('[data-pdp-tier-fill]'),
        tierHint: section.querySelector('[data-pdp-tier-hint]'),
        bundleItems: section.querySelectorAll('[data-pdp-bundle-item]'),
        savings: section.querySelector('[data-pdp-savings]'),
        itemCount: section.querySelector('[data-pdp-count]'),
        discount: section.querySelector('[data-pdp-discount]'),
        total: section.querySelector('[data-pdp-total]'),
        cta: section.querySelector('[data-pdp-cta]'),
        notification: section.querySelector('[data-pdp-notification]'),
      };

      this.imageCount = this.els.thumbs.length;

      // Initialize selected options from active buttons/swatches
      var self = this;
      this.els.optionGroups.forEach(function (group) {
        var pos = group.dataset.optionPosition;
        var activeBtn = group.querySelector('.bb-pdp__swatch--active, .bb-pdp__option-btn--active');
        if (activeBtn && pos) {
          self.selectedOptions[pos] = activeBtn.dataset.optionValue;
        }
      });

      this.bindEvents();
      this.recalculate();
    }

    bindEvents() {
      var self = this;

      // Thumbnail gallery clicks
      this.els.thumbs.forEach(function (thumb) {
        thumb.addEventListener('click', function () {
          self.goToImage(parseInt(thumb.dataset.mediaIndex, 10) || 0);
        });
      });

      // Dot indicator clicks
      this.els.dots.forEach(function (dot) {
        dot.addEventListener('click', function () {
          self.goToImage(parseInt(dot.dataset.dotIndex, 10) || 0);
        });
      });

      // Arrow button clicks
      if (this.els.prevArrow) {
        this.els.prevArrow.addEventListener('click', function () {
          self.prevImage();
        });
      }
      if (this.els.nextArrow) {
        this.els.nextArrow.addEventListener('click', function () {
          self.nextImage();
        });
      }

      // Keyboard navigation on gallery
      if (this.els.mainImageContainer) {
        this.els.mainImageContainer.setAttribute('tabindex', '0');
        this.els.mainImageContainer.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            self.prevImage();
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            self.nextImage();
          }
        });
      }

      // Touch/swipe support on main image
      if (this.els.mainImageWrap) {
        this.els.mainImageWrap.addEventListener('touchstart', function (e) {
          self.touchStartX = e.touches[0].clientX;
          self.touchStartY = e.touches[0].clientY;
          self.isSwiping = false;
        }, { passive: true });

        this.els.mainImageWrap.addEventListener('touchmove', function (e) {
          if (!self.isSwiping) {
            var dx = Math.abs(e.touches[0].clientX - self.touchStartX);
            var dy = Math.abs(e.touches[0].clientY - self.touchStartY);
            // If horizontal movement is dominant, we're swiping the gallery
            if (dx > dy && dx > 10) {
              self.isSwiping = true;
            }
          }
          // Prevent page scroll during horizontal swipe
          if (self.isSwiping) {
            e.preventDefault();
          }
        }, { passive: false });

        this.els.mainImageWrap.addEventListener('touchend', function (e) {
          if (!self.isSwiping) return;
          var endX = e.changedTouches[0].clientX;
          var diff = self.touchStartX - endX;
          if (Math.abs(diff) > 40) {
            if (diff > 0) {
              self.nextImage();
            } else {
              self.prevImage();
            }
          }
        }, { passive: true });
      }

      // Variant option buttons (swatches + size buttons)
      this.els.optionGroups.forEach(function (group) {
        var buttons = group.querySelectorAll('[data-option-value]');
        buttons.forEach(function (btn) {
          btn.addEventListener('click', function () {
            self.handleOptionSelect(group, btn);
          });
        });
      });

      // Bundle item selection
      this.els.bundleItems.forEach(function (item) {
        if (item.dataset.available === 'false') return;

        item.addEventListener('click', function (e) {
          if (e.target.closest('[data-action]')) return;
          self.toggleBundleItem(item);
        });

        item.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!e.target.closest('[data-action]')) {
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
        this.els.cta.addEventListener('click', function () {
          self.addToCart();
        });
      }
    }

    // ---- Gallery navigation ----

    prevImage() {
      if (this.imageCount <= 1) return;
      var idx = (this.activeThumbIndex - 1 + this.imageCount) % this.imageCount;
      this.goToImage(idx);
    }

    nextImage() {
      if (this.imageCount <= 1) return;
      var idx = (this.activeThumbIndex + 1) % this.imageCount;
      this.goToImage(idx);
    }

    goToImage(index) {
      if (index < 0 || index >= this.imageCount) return;
      if (index === this.activeThumbIndex) return;

      var thumb = this.els.thumbs[index];
      if (!thumb || !this.els.mainImage) return;

      // Update thumb active state
      this.els.thumbs.forEach(function (t) {
        t.classList.remove('bb-pdp__thumb--active');
      });
      thumb.classList.add('bb-pdp__thumb--active');

      // Update dot active state
      this.els.dots.forEach(function (d) {
        d.classList.remove('bb-pdp__dot--active');
      });
      if (this.els.dots[index]) {
        this.els.dots[index].classList.add('bb-pdp__dot--active');
      }

      this.activeThumbIndex = index;

      // Swap main image with fade
      var newSrc = thumb.dataset.imageSrc;
      var newSrcset = thumb.dataset.imageSrcset;
      var newAlt = thumb.dataset.imageAlt;

      if (this.els.mainImageWrap) {
        this.els.mainImageWrap.classList.add('bb-pdp__main-image--loading');
      }

      this.els.mainImage.src = newSrc;
      if (newSrcset) this.els.mainImage.srcset = newSrcset;
      if (newAlt) this.els.mainImage.alt = newAlt;

      var self = this;
      this.els.mainImage.onload = function () {
        if (self.els.mainImageWrap) {
          self.els.mainImageWrap.classList.remove('bb-pdp__main-image--loading');
        }
      };

      // Scroll thumb into view if needed
      var thumbsContainer = thumb.parentElement;
      if (thumbsContainer) {
        var thumbLeft = thumb.offsetLeft;
        var thumbWidth = thumb.offsetWidth;
        var containerScrollLeft = thumbsContainer.scrollLeft;
        var containerWidth = thumbsContainer.offsetWidth;

        if (thumbLeft < containerScrollLeft) {
          thumbsContainer.scrollTo({ left: thumbLeft - 8, behavior: 'smooth' });
        } else if (thumbLeft + thumbWidth > containerScrollLeft + containerWidth) {
          thumbsContainer.scrollTo({ left: thumbLeft + thumbWidth - containerWidth + 8, behavior: 'smooth' });
        }
      }
    }

    handleOptionSelect(group, btn) {
      var position = group.dataset.optionPosition;
      var value = btn.dataset.optionValue;

      // Update active state for buttons in this group
      var isSwatch = btn.classList.contains('bb-pdp__swatch');
      var activeClass = isSwatch ? 'bb-pdp__swatch--active' : 'bb-pdp__option-btn--active';

      group.querySelectorAll('[data-option-value]').forEach(function (b) {
        b.classList.remove('bb-pdp__swatch--active', 'bb-pdp__option-btn--active');
      });
      btn.classList.add(activeClass);

      // Update selected option name display (for color)
      var nameSpan = group.querySelector('[data-option-selected-name]');
      if (nameSpan) nameSpan.textContent = value;

      // Update selectedOptions and find matching variant
      this.selectedOptions[position] = value;
      var matchingVariant = this.findVariant();

      if (matchingVariant) {
        // Update price
        if (this.els.priceEl) {
          this.els.priceEl.textContent = Core.formatMoney(matchingVariant.price, this.moneyFormat);
        }

        if (this.els.comparePriceEl) {
          if (matchingVariant.compare_at_price && matchingVariant.compare_at_price > matchingVariant.price) {
            this.els.comparePriceEl.textContent = Core.formatMoney(matchingVariant.compare_at_price, this.moneyFormat);
            this.els.comparePriceEl.style.display = '';
          } else {
            this.els.comparePriceEl.style.display = 'none';
          }
        }

        // Jump to variant's featured image
        if (matchingVariant.featured_media_id) {
          for (var i = 0; i < this.els.thumbs.length; i++) {
            if (String(this.els.thumbs[i].dataset.mediaId) === String(matchingVariant.featured_media_id)) {
              this.goToImage(i);
              break;
            }
          }
        }

        // Mark unavailable options across other groups
        this.updateOptionAvailability();

        // Update URL
        var productUrl = this.section.dataset.productUrl;
        if (productUrl && window.history && window.history.replaceState) {
          window.history.replaceState({}, '', productUrl + '?variant=' + matchingVariant.id);
        }
      }
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
          // Check if any variant with this option value is available
          var available = self.variants.some(function (v) {
            if (v.options[optionIndex] !== testValue) return false;
            // Check if all other selected options match
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
            if (available) {
              btn.classList.remove('bb-pdp__swatch--unavailable');
            } else {
              btn.classList.add('bb-pdp__swatch--unavailable');
            }
          } else {
            if (available) {
              btn.classList.remove('bb-pdp__option-btn--unavailable');
            } else {
              btn.classList.add('bb-pdp__option-btn--unavailable');
            }
          }
        });
      });
    }

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
      this.selectedProducts.forEach(function (item) {
        total += item.quantity;
      });
      return total;
    }

    getSubtotal() {
      var subtotal = 0;
      this.selectedProducts.forEach(function (item) {
        subtotal += item.price * item.quantity;
      });
      return subtotal;
    }

    recalculate() {
      var totalItems = this.getTotalItems();
      var subtotal = this.getSubtotal();
      var activeTier = Core.getActiveTier(this.tiers, totalItems);
      var activeTierIndex = Core.getActiveTierIndex(this.tiers, totalItems);
      var nextTier = Core.getNextTier(this.tiers, totalItems);
      var discountAmount = Core.calculateDiscount(subtotal, activeTier, this.discountType);
      var total = Math.max(0, subtotal - discountAmount);

      // Update summary
      if (this.els.itemCount) {
        this.els.itemCount.textContent = totalItems;
      }

      if (this.els.discount) {
        this.els.discount.textContent = discountAmount > 0 ? '-' + Core.formatMoney(discountAmount, this.moneyFormat) : Core.formatMoney(0, this.moneyFormat);
        var discountRow = this.els.discount.closest('.bb-pdp__summary-row');
        if (discountRow) discountRow.style.display = discountAmount > 0 ? '' : 'none';
      }

      if (this.els.total) {
        this.els.total.textContent = Core.formatMoney(total, this.moneyFormat);
      }

      // Savings
      if (this.els.savings) {
        if (this.showSavings && discountAmount > 0) {
          this.els.savings.removeAttribute('hidden');
          this.els.savings.textContent = 'You save ' + Core.formatMoney(discountAmount, this.moneyFormat) + '!';
        } else {
          this.els.savings.setAttribute('hidden', '');
        }
      }

      // Tier progress
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

        if (minusBtn) {
          minusBtn.disabled = !entry || entry.quantity <= 1;
        }
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

    /**
     * Continuous tier progress — fills smoothly from 0% to 100% across all tiers.
     * Uses the last tier's count as the 100% mark. Shows current tier status and
     * what's needed for the next tier.
     */
    updateTierProgress(totalItems, activeTier, activeTierIndex, nextTier) {
      if (!this.els.tierFill || !this.els.tierLabel) return;

      var lastTierCount = this.tiers.length > 0 ? this.tiers[this.tiers.length - 1].count : 0;

      if (lastTierCount === 0) {
        this.els.tierFill.style.width = '0%';
        this.els.tierLabel.textContent = 'Select items to unlock discounts';
        if (this.els.tierHint) this.els.tierHint.style.display = 'none';
        return;
      }

      // Continuous progress: 0% at 0 items, 100% at last tier count
      var progress = Math.min(100, Math.max(0, (totalItems / lastTierCount) * 100));
      this.els.tierFill.style.width = progress + '%';

      if (nextTier) {
        var needed = nextTier.count - totalItems;
        var nextLabel = this.discountType === 'percentage'
          ? nextTier.discount + '% off'
          : Core.formatMoney(nextTier.discount, this.moneyFormat) + ' off';
        var nextName = nextTier.label || nextLabel;
        this.els.tierLabel.textContent = 'Add ' + needed + ' more for ' + nextName + '!';

        if (this.els.tierHint && activeTier) {
          var currentLabel = this.discountType === 'percentage'
            ? activeTier.discount + '% off'
            : Core.formatMoney(activeTier.discount, this.moneyFormat) + ' off';
          this.els.tierHint.textContent = 'Current: ' + (activeTier.label || currentLabel);
          this.els.tierHint.style.display = '';
        } else if (this.els.tierHint) {
          this.els.tierHint.style.display = 'none';
        }
      } else if (activeTier) {
        // All tiers unlocked
        this.els.tierFill.style.width = '100%';
        var maxLabel = this.discountType === 'percentage'
          ? activeTier.discount + '% off'
          : Core.formatMoney(activeTier.discount, this.moneyFormat) + ' off';
        this.els.tierLabel.textContent = activeTier.label
          ? activeTier.label + ' unlocked!'
          : 'Max discount unlocked: ' + maxLabel;
        if (this.els.tierHint) this.els.tierHint.style.display = 'none';
      } else {
        // No items selected
        this.els.tierFill.style.width = '0%';
        this.els.tierLabel.textContent = 'Select items to unlock discounts';
        if (this.els.tierHint) this.els.tierHint.style.display = 'none';
      }
    }

    manageFreeGifts(activeTierIndex, previousTierIndex) {
      if (this.freeGiftPending) return;
      var self = this;

      var targetGiftIds = Core.getTargetGiftIds(this.tiers, activeTierIndex);
      var targetSet = {};
      for (var i = 0; i < targetGiftIds.length; i++) {
        targetSet[targetGiftIds[i]] = true;
      }

      var toRemove = [];
      var toAdd = [];

      this.activeFreeGifts.forEach(function (_val, key) {
        if (!targetSet[key]) toRemove.push(key);
      });

      for (var j = 0; j < targetGiftIds.length; j++) {
        if (!this.activeFreeGifts.has(targetGiftIds[j])) {
          toAdd.push(targetGiftIds[j]);
        }
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
          if (result && result.added) {
            self.activeFreeGifts.set(id, true);
          }
          if (result && result.reason === 'unavailable') {
            self.showNotification('Free gift is currently unavailable');
          }
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
        if (tierLabel) {
          lineItem.properties['_bundle_tier'] = tierLabel;
        }
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
        setTimeout(function () {
          self.recalculate();
        }, 3000);
      } finally {
        if (!this.isRedirecting) {
          this.isLoading = false;
          if (this.els.cta) this.els.cta.disabled = false;
        }
      }
    }
  }

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
