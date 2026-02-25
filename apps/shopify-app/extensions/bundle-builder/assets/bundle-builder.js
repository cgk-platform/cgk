/**
 * Bundle Builder — Vanilla JS
 * Handles product selection, tier-based pricing, quantity controls, and Shopify Cart API integration.
 * Uses BundleCore for shared pricing, tier, cart, and free gift logic.
 */
(function () {
  'use strict';

  var instances = new WeakMap();
  var Core = window.BundleCore;

  class BundleBuilder {
    constructor(section) {
      this.section = section;
      this.selectedProducts = new Map();

      // Parse metafield config if available (Pattern E: metafield-driven business data)
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
      this.activeFreeGifts = new Map(); // variantId -> true
      this.freeGiftPending = false;

      this.els = {
        cards: section.querySelectorAll('.bb-card'),
        tierSection: section.querySelector('.bb-tier'),
        tierLabel: section.querySelector('.bb-tier__label'),
        tierFill: section.querySelector('.bb-tier__fill'),
        tierBar: section.querySelector('[role="progressbar"]'),
        tierHint: section.querySelector('.bb-tier__hint'),
        subtotal: section.querySelector('[data-summary="subtotal"]'),
        discount: section.querySelector('[data-summary="discount"]'),
        total: section.querySelector('[data-summary="total"]'),
        savings: section.querySelector('.bb-savings'),
        cta: section.querySelector('.bb-cta'),
        itemCount: section.querySelector('[data-summary="count"]'),
        tierBadge: section.querySelector('[data-summary="tier"]'),
        notification: section.querySelector('.bb-notification'),
      };

      this.bindEvents();
      this.recalculate();
    }

    bindEvents() {
      var self = this;

      this.els.cards.forEach(function (card) {
        if (card.dataset.available === 'false') return;

        card.addEventListener('click', function (e) {
          if (e.target.closest('.bb-qty-btn') || e.target.closest('.bb-variant-picker')) return;
          self.toggleProduct(card);
        });

        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!e.target.closest('.bb-qty-btn') && !e.target.closest('.bb-variant-picker')) {
              self.toggleProduct(card);
            }
          }
        });

        var variantPicker = card.querySelector('[data-action="variant-change"]');
        if (variantPicker) {
          variantPicker.addEventListener('change', function (e) {
            e.stopPropagation();
            self.handleVariantChange(card, e.target);
          });
        }

        var minusBtn = card.querySelector('[data-action="decrease"]');
        var plusBtn = card.querySelector('[data-action="increase"]');

        if (minusBtn) {
          minusBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            self.updateQuantity(card, -1);
          });
        }

        if (plusBtn) {
          plusBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            self.updateQuantity(card, 1);
          });
        }
      });

      if (this.els.cta) {
        this.els.cta.addEventListener('click', function () {
          self.addToCart();
        });
      }
    }

    toggleProduct(card) {
      var variantId = card.dataset.variantId;
      if (card.dataset.available === 'false') return;

      if (this.selectedProducts.has(variantId)) {
        this.selectedProducts.delete(variantId);
        card.classList.remove('bb-card--selected');
        card.setAttribute('aria-pressed', 'false');
      } else {
        var totalItems = this.getTotalItems();
        if (totalItems >= this.maxItems) return;

        this.selectedProducts.set(variantId, {
          productId: card.dataset.productId,
          variantId: variantId,
          title: card.dataset.title,
          price: parseInt(card.dataset.price, 10),
          quantity: 1,
        });
        card.classList.add('bb-card--selected');
        card.setAttribute('aria-pressed', 'true');

        var qtyDisplay = card.querySelector('.bb-qty-value');
        if (qtyDisplay) {
          qtyDisplay.textContent = '1';
        }
      }

      this.recalculate();
    }

    updateQuantity(card, delta) {
      var variantId = card.dataset.variantId;
      var item = this.selectedProducts.get(variantId);
      if (!item) return;

      var newQty = item.quantity + delta;
      var totalOther = this.getTotalItems() - item.quantity;

      if (newQty < 1) {
        this.selectedProducts.delete(variantId);
        card.classList.remove('bb-card--selected');
        card.setAttribute('aria-pressed', 'false');
      } else if (totalOther + newQty > this.maxItems) {
        return;
      } else {
        item.quantity = newQty;
      }

      var qtyDisplay = card.querySelector('.bb-qty-value');
      if (qtyDisplay && this.selectedProducts.has(variantId)) {
        qtyDisplay.textContent = this.selectedProducts.get(variantId).quantity;
      }

      this.recalculate();
    }

    handleVariantChange(card, select) {
      var selectedOption = select.options[select.selectedIndex];
      var newVariantId = selectedOption.value;
      var newPrice = parseInt(selectedOption.dataset.price, 10);
      var newAvailable = selectedOption.dataset.available === 'true';
      var oldVariantId = card.dataset.variantId;

      card.dataset.variantId = newVariantId;
      card.dataset.price = newPrice;
      card.dataset.available = String(newAvailable);

      var priceEl = card.querySelector('.bb-card__price');
      if (priceEl) {
        priceEl.textContent = Core.formatMoney(newPrice, this.moneyFormat);
      }

      if (newAvailable) {
        card.classList.remove('bb-card--sold-out');
        card.tabIndex = 0;
        card.removeAttribute('aria-disabled');
      } else {
        card.classList.add('bb-card--sold-out');
        card.tabIndex = -1;
        card.setAttribute('aria-disabled', 'true');
      }

      if (this.selectedProducts.has(oldVariantId)) {
        var item = this.selectedProducts.get(oldVariantId);
        this.selectedProducts.delete(oldVariantId);

        if (newAvailable) {
          this.selectedProducts.set(newVariantId, {
            productId: card.dataset.productId,
            variantId: newVariantId,
            title: item.title,
            price: newPrice,
            quantity: item.quantity,
          });
        } else {
          card.classList.remove('bb-card--selected');
          card.setAttribute('aria-pressed', 'false');
        }

        this.recalculate();
      }
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

      if (this.els.subtotal) {
        this.els.subtotal.textContent = Core.formatMoney(subtotal, this.moneyFormat);
      }

      if (this.els.discount) {
        this.els.discount.textContent = discountAmount > 0 ? '-' + Core.formatMoney(discountAmount, this.moneyFormat) : Core.formatMoney(0, this.moneyFormat);
        var discountRow = this.els.discount.closest('.bb-summary__row');
        if (discountRow) discountRow.style.display = discountAmount > 0 ? '' : 'none';
      }

      if (this.els.total) {
        this.els.total.textContent = Core.formatMoney(total, this.moneyFormat);
      }

      if (this.els.itemCount) {
        this.els.itemCount.textContent = totalItems;
      }

      if (this.els.tierBadge) {
        var tierRow = this.els.tierBadge.closest('.bb-summary__row');
        if (activeTier) {
          var discountLabel = this.discountType === 'percentage'
            ? activeTier.discount + '% off'
            : Core.formatMoney(activeTier.discount, this.moneyFormat) + ' off';
          var badgeText = activeTier.label ? activeTier.label + ' \u2014 ' + discountLabel : discountLabel;
          this.els.tierBadge.textContent = badgeText;
          if (tierRow) tierRow.style.display = '';
        } else {
          this.els.tierBadge.textContent = '';
          if (tierRow) tierRow.style.display = 'none';
        }
      }

      if (this.els.savings) {
        if (this.showSavings && discountAmount > 0) {
          this.els.savings.removeAttribute('hidden');
          this.els.savings.textContent = 'You save ' + Core.formatMoney(discountAmount, this.moneyFormat) + '!';
        } else {
          this.els.savings.setAttribute('hidden', '');
        }
      }

      if (this.showTierProgress && this.els.tierSection) {
        this.updateTierProgress(totalItems, activeTier, nextTier);
      }

      if (activeTierIndex > this.previousTierIndex && this.previousTierIndex >= 0) {
        this.showTierNotification(activeTier);
      }
      var previousTierIndex = this.previousTierIndex;
      this.previousTierIndex = activeTierIndex;

      // Manage free gifts when tier changes
      this.manageFreeGifts(activeTierIndex, previousTierIndex);

      // Max items reached — dim unselected available cards
      if (totalItems >= this.maxItems) {
        this.section.classList.add('bb-container--max-reached');
      } else {
        this.section.classList.remove('bb-container--max-reached');
      }

      // CTA button state
      if (this.els.cta) {
        var availableCards = this.section.querySelectorAll('.bb-card:not(.bb-card--sold-out)');
        var canAdd = totalItems >= this.minItems && totalItems > 0;

        this.els.cta.disabled = !canAdd || this.isLoading;

        if (!this.isLoading) {
          if (availableCards.length === 0) {
            this.els.cta.textContent = 'All items currently sold out';
            this.els.cta.disabled = true;
          } else if (availableCards.length < this.minItems) {
            this.els.cta.textContent = 'Not enough products available';
            this.els.cta.disabled = true;
          } else if (canAdd && total > 0) {
            this.els.cta.textContent = this.ctaText + ' \u2014 ' + Core.formatMoney(total, this.moneyFormat);
          } else {
            this.els.cta.textContent = this.ctaText;
          }
        }
      }

      // Update quantity button states
      var self = this;
      this.els.cards.forEach(function (card) {
        var minusBtn = card.querySelector('[data-action="decrease"]');
        var plusBtn = card.querySelector('[data-action="increase"]');
        var variantId = card.dataset.variantId;
        var item = self.selectedProducts.get(variantId);

        if (minusBtn) {
          minusBtn.disabled = !item || item.quantity <= 1;
        }
        if (plusBtn) {
          var totalOther = self.getTotalItems() - (item ? item.quantity : 0);
          plusBtn.disabled = !item || (totalOther + item.quantity >= self.maxItems);
        }
      });
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

        var nextDiscountLabel = this.discountType === 'percentage'
          ? nextTier.discount + '% off'
          : Core.formatMoney(nextTier.discount, this.moneyFormat) + ' off';
        var nextName = nextTier.label ? nextTier.label + ' \u2014 ' + nextDiscountLabel : nextDiscountLabel;
        this.els.tierLabel.textContent = 'Add ' + needed + ' more for ' + nextName + '!';

        if (this.els.tierHint && activeTier) {
          var currentDiscountLabel = this.discountType === 'percentage'
            ? activeTier.discount + '% off'
            : Core.formatMoney(activeTier.discount, this.moneyFormat) + ' off';
          var currentName = activeTier.label || currentDiscountLabel;
          this.els.tierHint.textContent = 'Current: ' + currentName;
          this.els.tierHint.style.display = '';
        } else if (this.els.tierHint) {
          this.els.tierHint.style.display = 'none';
        }
      } else if (activeTier) {
        progress = 100;
        this.els.tierFill.style.width = '100%';
        var maxDiscountLabel = this.discountType === 'percentage'
          ? activeTier.discount + '% off'
          : Core.formatMoney(activeTier.discount, this.moneyFormat) + ' off';
        var maxName = activeTier.label ? activeTier.label + ' unlocked!' : 'Max discount unlocked: ' + maxDiscountLabel;
        this.els.tierLabel.textContent = maxName;
        if (this.els.tierHint) {
          this.els.tierHint.style.display = 'none';
        }
      } else {
        this.els.tierFill.style.width = '0%';
        if (this.tiers.length > 0) {
          this.els.tierLabel.textContent = 'Select items to unlock discounts';
        }
        if (this.els.tierHint) {
          this.els.tierHint.style.display = 'none';
        }
      }

      if (this.els.tierBar) {
        this.els.tierBar.setAttribute('aria-valuenow', Math.round(progress));
      }
    }

    showTierNotification(tier) {
      if (!tier || !this.els.notification) return;

      var discountLabel = this.discountType === 'percentage'
        ? tier.discount + '% off'
        : Core.formatMoney(tier.discount, this.moneyFormat) + ' off';
      var message = tier.label
        ? tier.label + ' unlocked! ' + discountLabel
        : 'Discount unlocked: ' + discountLabel;

      if (this.notificationTimeout) {
        clearTimeout(this.notificationTimeout);
      }

      this.els.notification.textContent = '';
      if (tier.icon) {
        var img = document.createElement('img');
        img.src = tier.icon;
        img.alt = '';
        img.className = 'bb-notification__icon';
        img.width = 24;
        img.height = 24;
        this.els.notification.appendChild(img);
        this.els.notification.appendChild(document.createTextNode(' ' + message));
      } else {
        this.els.notification.textContent = message;
      }
      this.els.notification.classList.add('bb-notification--visible');

      var self = this;
      this.notificationTimeout = setTimeout(function () {
        self.els.notification.classList.remove('bb-notification--visible');
        self.notificationTimeout = null;
      }, 3000);
    }

    /**
     * Manage free gifts based on cumulative per-tier freeGiftVariantIds.
     * Aggregates gifts from all qualifying tiers, then adds/removes as needed.
     * Uses sequential promises to avoid Cart API race conditions.
     */
    manageFreeGifts(activeTierIndex, previousTierIndex) {
      if (this.freeGiftPending) return;
      var self = this;

      // Compute cumulative target gift IDs from all qualifying tiers
      var targetGiftIds = Core.getTargetGiftIds(this.tiers, activeTierIndex);
      var targetSet = {};
      for (var i = 0; i < targetGiftIds.length; i++) {
        targetSet[targetGiftIds[i]] = true;
      }

      // Determine what to add and remove
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

      // Remove old gifts first (sequential to avoid race conditions)
      toRemove.forEach(function (id) {
        operation = operation.then(function () {
          return Core.removeFreeGiftFromCart(id, self.bundleId);
        }).then(function () {
          self.activeFreeGifts.delete(id);
        });
      });

      // Then add new gifts (sequential)
      toAdd.forEach(function (id) {
        operation = operation.then(function () {
          return Core.addFreeGiftToCart(id, self.bundleId, self.bundleName);
        }).then(function (result) {
          if (result && result.added) {
            self.activeFreeGifts.set(id, true);
          }
          if (result && result.reason === 'unavailable') {
            self.showGiftUnavailableNotification();
          }
        });
      });

      // Show success notification if gifts were added
      if (toAdd.length > 0) {
        operation = operation.then(function () {
          self.showFreeGiftNotification();
        });
      }

      operation
        .then(function () { self.freeGiftPending = false; })
        .catch(function () { self.freeGiftPending = false; });
    }

    showFreeGiftNotification() {
      if (!this.els.notification) return;

      if (this.notificationTimeout) {
        clearTimeout(this.notificationTimeout);
      }

      this.els.notification.textContent = 'Free gift added to your cart!';
      this.els.notification.classList.add('bb-notification--visible');

      var self = this;
      this.notificationTimeout = setTimeout(function () {
        self.els.notification.classList.remove('bb-notification--visible');
        self.notificationTimeout = null;
      }, 3000);
    }

    showGiftUnavailableNotification() {
      if (!this.els.notification) return;

      if (this.notificationTimeout) {
        clearTimeout(this.notificationTimeout);
      }

      this.els.notification.textContent = 'Free gift is currently unavailable';
      this.els.notification.classList.add('bb-notification--visible');

      var self = this;
      this.notificationTimeout = setTimeout(function () {
        self.els.notification.classList.remove('bb-notification--visible');
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
      this.els.cta.classList.add('bb-cta--loading');

      var activeTier = Core.getActiveTier(this.tiers, this.getTotalItems());

      var items = [];
      var bundleId = this.bundleId;
      var bundleName = this.bundleName;
      var discountType = this.discountType;
      var tierLabel = activeTier && activeTier.label ? activeTier.label : '';
      var totalItems = this.getTotalItems();

      this.selectedProducts.forEach(function (item) {
        var lineItem = {
          id: parseInt(item.variantId, 10),
          quantity: item.quantity,
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
        this.els.cta.classList.remove('bb-cta--loading');
        this.els.cta.classList.add('bb-cta--success');

        setTimeout(function () {
          self.els.cta.classList.remove('bb-cta--success');
          self.recalculate();
        }, 2000);
      } catch (err) {
        console.error('[BundleBuilder] Cart error:', err);
        if (this.els.cta) {
          this.els.cta.textContent = 'Error \u2014 Try Again';
          this.els.cta.classList.remove('bb-cta--loading');
        }

        setTimeout(function () {
          self.recalculate();
        }, 3000);
      } finally {
        if (!this.isRedirecting) {
          this.isLoading = false;
          if (this.els.cta) {
            this.els.cta.disabled = false;
          }
        }
      }
    }
  }

  function init() {
    document.querySelectorAll('[data-bundle-builder]').forEach(function (el) {
      if (!instances.has(el)) {
        instances.set(el, new BundleBuilder(el));
      }
    });
  }

  // Shopify theme editor integration — re-initialize on section/block changes
  document.addEventListener('shopify:section:load', function () {
    init();
  });

  document.addEventListener('shopify:section:select', function () {
    init();
  });

  document.addEventListener('shopify:block:select', function (e) {
    var target = e.target.querySelector('[data-bundle-builder]');
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
