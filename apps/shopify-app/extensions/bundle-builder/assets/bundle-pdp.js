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

      this.els = {
        mainImage: section.querySelector('[data-pdp-main-img]'),
        mainImageWrap: section.querySelector('[data-pdp-main-image]'),
        thumbs: section.querySelectorAll('[data-pdp-thumb]'),
        variantSelect: section.querySelector('[data-pdp-variant-select]'),
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

      this.bindEvents();
      this.recalculate();
    }

    bindEvents() {
      var self = this;

      // Thumbnail gallery clicks
      this.els.thumbs.forEach(function (thumb) {
        thumb.addEventListener('click', function () {
          self.selectThumb(thumb);
        });
      });

      // Touch/swipe support on main image
      if (this.els.mainImageWrap) {
        var startX = 0;
        this.els.mainImageWrap.addEventListener('touchstart', function (e) {
          startX = e.touches[0].clientX;
        }, { passive: true });

        this.els.mainImageWrap.addEventListener('touchend', function (e) {
          var endX = e.changedTouches[0].clientX;
          var diff = startX - endX;
          if (Math.abs(diff) > 50) {
            var totalThumbs = self.els.thumbs.length;
            if (totalThumbs <= 1) return;
            if (diff > 0) {
              // Swipe left -> next
              var nextIndex = (self.activeThumbIndex + 1) % totalThumbs;
              self.selectThumb(self.els.thumbs[nextIndex]);
            } else {
              // Swipe right -> prev
              var prevIndex = (self.activeThumbIndex - 1 + totalThumbs) % totalThumbs;
              self.selectThumb(self.els.thumbs[prevIndex]);
            }
          }
        }, { passive: true });
      }

      // Variant selector
      if (this.els.variantSelect) {
        this.els.variantSelect.addEventListener('change', function () {
          self.handleVariantChange();
        });
      }

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

    selectThumb(thumb) {
      if (!this.els.mainImage) return;

      this.els.thumbs.forEach(function (t) {
        t.classList.remove('bb-pdp__thumb--active');
      });
      thumb.classList.add('bb-pdp__thumb--active');

      this.activeThumbIndex = parseInt(thumb.dataset.mediaIndex, 10) || 0;

      // Swap main image
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
    }

    handleVariantChange() {
      var select = this.els.variantSelect;
      var option = select.options[select.selectedIndex];
      var price = parseInt(option.dataset.price, 10);
      var comparePrice = parseInt(option.dataset.comparePrice, 10);
      var imageIndex = parseInt(option.dataset.imageIndex, 10);

      if (this.els.priceEl) {
        this.els.priceEl.textContent = Core.formatMoney(price, this.moneyFormat);
      }

      if (this.els.comparePriceEl) {
        if (comparePrice > price) {
          this.els.comparePriceEl.textContent = Core.formatMoney(comparePrice, this.moneyFormat);
          this.els.comparePriceEl.style.display = '';
        } else {
          this.els.comparePriceEl.style.display = 'none';
        }
      }

      // Select corresponding thumbnail
      if (!isNaN(imageIndex) && this.els.thumbs[imageIndex]) {
        this.selectThumb(this.els.thumbs[imageIndex]);
      }
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
        this.updateTierProgress(totalItems, activeTier, nextTier);
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

    updateTierProgress(totalItems, activeTier, nextTier) {
      if (!this.els.tierFill || !this.els.tierLabel) return;

      var progress = 0;

      if (nextTier) {
        var needed = nextTier.count - totalItems;
        if (activeTier) {
          progress = ((totalItems - activeTier.count) / (nextTier.count - activeTier.count)) * 100;
        } else {
          progress = (totalItems / nextTier.count) * 100;
        }
        progress = Math.min(100, Math.max(0, progress));
        this.els.tierFill.style.width = progress + '%';

        var nextLabel = this.discountType === 'percentage'
          ? nextTier.discount + '% off'
          : Core.formatMoney(nextTier.discount, this.moneyFormat) + ' off';
        var nextName = nextTier.label ? nextTier.label + ' \u2014 ' + nextLabel : nextLabel;
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
        progress = 100;
        this.els.tierFill.style.width = '100%';
        var maxLabel = this.discountType === 'percentage'
          ? activeTier.discount + '% off'
          : Core.formatMoney(activeTier.discount, this.moneyFormat) + ' off';
        this.els.tierLabel.textContent = activeTier.label ? activeTier.label + ' unlocked!' : 'Max discount unlocked: ' + maxLabel;
        if (this.els.tierHint) this.els.tierHint.style.display = 'none';
      } else {
        this.els.tierFill.style.width = '0%';
        if (this.tiers.length > 0) {
          this.els.tierLabel.textContent = 'Select items to unlock discounts';
        }
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
