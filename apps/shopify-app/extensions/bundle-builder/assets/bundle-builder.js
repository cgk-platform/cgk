/**
 * Bundle Builder — Vanilla JS
 * Handles product selection, tier-based pricing, quantity controls, and Shopify Cart API integration.
 */
(function () {
  'use strict';

  var instances = new WeakMap();

  class BundleBuilder {
    constructor(section) {
      this.section = section;
      this.selectedProducts = new Map();
      this.tiers = this.parseTiers();
      this.minItems = parseInt(section.dataset.minItems, 10) || 1;
      this.maxItems = parseInt(section.dataset.maxItems, 10) || 99;
      this.discountType = section.dataset.discountType || 'percentage';
      this.showSavings = section.dataset.showSavings === 'true';
      this.showTierProgress = section.dataset.showTierProgress === 'true';
      this.bundleName = section.dataset.bundleName || 'Bundle';
      this.bundleId = section.dataset.blockId || section.dataset.sectionId || 'bundle';
      this.ctaText = section.dataset.ctaText || 'Add Bundle to Cart';
      this.cartRedirect = section.dataset.cartRedirect === 'true';
      this.moneyFormat = section.dataset.moneyFormat || '';
      this.isLoading = false;
      this.isRedirecting = false;
      this.previousTierIndex = -1;
      this.notificationTimeout = null;
      this.activeFreeGifts = new Map(); // variantId -> cart line key
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

    parseTiers() {
      var tiersData = this.section.dataset.tiers;
      if (!tiersData) return [];
      try {
        var tiers = JSON.parse(tiersData);
        return tiers.sort(function (a, b) { return a.count - b.count; });
      } catch (_e) {
        return [];
      }
    }

    bindEvents() {
      var self = this;

      this.els.cards.forEach(function (card) {
        if (card.dataset.available === 'false') return;

        card.addEventListener('click', function (e) {
          if (e.target.closest('.bb-qty-btn')) return;
          self.toggleProduct(card);
        });

        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!e.target.closest('.bb-qty-btn')) {
              self.toggleProduct(card);
            }
          }
        });

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

    getActiveTier() {
      var totalItems = this.getTotalItems();
      var activeTier = null;

      for (var i = this.tiers.length - 1; i >= 0; i--) {
        if (totalItems >= this.tiers[i].count) {
          activeTier = this.tiers[i];
          break;
        }
      }

      return activeTier;
    }

    getActiveTierIndex() {
      var totalItems = this.getTotalItems();
      for (var i = this.tiers.length - 1; i >= 0; i--) {
        if (totalItems >= this.tiers[i].count) {
          return i;
        }
      }
      return -1;
    }

    getNextTier() {
      var totalItems = this.getTotalItems();
      for (var i = 0; i < this.tiers.length; i++) {
        if (totalItems < this.tiers[i].count) {
          return this.tiers[i];
        }
      }
      return null;
    }

    calculateDiscount(subtotal, tier) {
      if (!tier) return 0;
      if (this.discountType === 'percentage') {
        var pct = Math.min(tier.discount, 100);
        return Math.round(subtotal * (pct / 100));
      }
      return Math.min(tier.discount, subtotal);
    }

    recalculate() {
      var totalItems = this.getTotalItems();
      var subtotal = this.getSubtotal();
      var activeTier = this.getActiveTier();
      var activeTierIndex = this.getActiveTierIndex();
      var nextTier = this.getNextTier();
      var discountAmount = this.calculateDiscount(subtotal, activeTier);
      var total = Math.max(0, subtotal - discountAmount);

      if (this.els.subtotal) {
        this.els.subtotal.textContent = this.formatMoney(subtotal);
      }

      if (this.els.discount) {
        this.els.discount.textContent = discountAmount > 0 ? '-' + this.formatMoney(discountAmount) : this.formatMoney(0);
        var discountRow = this.els.discount.closest('.bb-summary__row');
        if (discountRow) discountRow.style.display = discountAmount > 0 ? '' : 'none';
      }

      if (this.els.total) {
        this.els.total.textContent = this.formatMoney(total);
      }

      if (this.els.itemCount) {
        this.els.itemCount.textContent = totalItems;
      }

      if (this.els.tierBadge) {
        var tierRow = this.els.tierBadge.closest('.bb-summary__row');
        if (activeTier) {
          var discountLabel = this.discountType === 'percentage'
            ? activeTier.discount + '% off'
            : this.formatMoney(activeTier.discount) + ' off';
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
          this.els.savings.textContent = 'You save ' + this.formatMoney(discountAmount) + '!';
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
      this.manageFreeGifts(activeTier, activeTierIndex, previousTierIndex);

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
            this.els.cta.textContent = this.ctaText + ' \u2014 ' + this.formatMoney(total);
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
          : this.formatMoney(nextTier.discount) + ' off';
        var nextName = nextTier.label ? nextTier.label + ' \u2014 ' + nextDiscountLabel : nextDiscountLabel;
        this.els.tierLabel.textContent = 'Add ' + needed + ' more for ' + nextName + '!';

        if (this.els.tierHint && activeTier) {
          var currentDiscountLabel = this.discountType === 'percentage'
            ? activeTier.discount + '% off'
            : this.formatMoney(activeTier.discount) + ' off';
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
          : this.formatMoney(activeTier.discount) + ' off';
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

      // Update ARIA progressbar
      if (this.els.tierBar) {
        this.els.tierBar.setAttribute('aria-valuenow', Math.round(progress));
      }
    }

    showTierNotification(tier) {
      if (!tier || !this.els.notification) return;

      var discountLabel = this.discountType === 'percentage'
        ? tier.discount + '% off'
        : this.formatMoney(tier.discount) + ' off';
      var message = tier.label
        ? tier.label + ' unlocked! ' + discountLabel
        : 'Discount unlocked: ' + discountLabel;

      // Clear any existing notification timeout to prevent race conditions
      if (this.notificationTimeout) {
        clearTimeout(this.notificationTimeout);
      }

      // Render with tier icon if present
      if (tier.icon) {
        this.els.notification.innerHTML = '<img src="' + tier.icon + '" alt="" class="bb-notification__icon" width="24" height="24"> ' + message;
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

    manageFreeGifts(activeTier, activeTierIndex, previousTierIndex) {
      if (this.freeGiftPending) return;
      var self = this;

      // Determine which free gift variant IDs should be active
      // Each tier can have a freeGiftVariantId — use the highest qualifying tier's gift
      var targetGiftId = null;
      if (activeTier && activeTier.freeGiftVariantId) {
        targetGiftId = activeTier.freeGiftVariantId;
      } else if (activeTierIndex >= 0) {
        // Check lower tiers for gifts
        for (var i = activeTierIndex; i >= 0; i--) {
          if (this.tiers[i].freeGiftVariantId) {
            targetGiftId = this.tiers[i].freeGiftVariantId;
            break;
          }
        }
      }

      // Get the currently active gift (if any)
      var currentGiftId = this.activeFreeGifts.size > 0 ? this.activeFreeGifts.keys().next().value : null;

      // If tier dropped and gift should be removed
      if (!targetGiftId && currentGiftId) {
        this.freeGiftPending = true;
        this.removeFreeGift(currentGiftId).then(function () {
          self.activeFreeGifts.delete(currentGiftId);
          self.freeGiftPending = false;
        }).catch(function () {
          self.freeGiftPending = false;
        });
        return;
      }

      // If gift should change
      if (targetGiftId && targetGiftId !== currentGiftId) {
        this.freeGiftPending = true;

        var addGift = function () {
          return self.addFreeGift(targetGiftId).then(function () {
            self.activeFreeGifts.set(targetGiftId, true);
            self.freeGiftPending = false;
            self.showFreeGiftNotification();
          }).catch(function () {
            self.freeGiftPending = false;
          });
        };

        // Remove old gift first if present
        if (currentGiftId) {
          this.removeFreeGift(currentGiftId).then(function () {
            self.activeFreeGifts.delete(currentGiftId);
            addGift();
          }).catch(function () {
            self.freeGiftPending = false;
          });
        } else {
          addGift();
        }
      }
    }

    addFreeGift(variantId) {
      return fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            id: parseInt(variantId, 10),
            quantity: 1,
            properties: {
              '_bundle_id': this.bundleId,
              '_bundle_name': this.bundleName,
              '_bundle_free_gift': 'true',
            },
          }],
        }),
      }).then(function (res) {
        if (!res.ok) throw new Error('Failed to add free gift');
        document.dispatchEvent(new CustomEvent('cart:updated'));
        document.dispatchEvent(new CustomEvent('cart:refresh'));
      });
    }

    removeFreeGift(variantId) {
      // Fetch cart to find the line with this variant + _bundle_free_gift
      var self = this;
      return fetch('/cart.js')
        .then(function (res) { return res.json(); })
        .then(function (cart) {
          var giftItem = cart.items.find(function (item) {
            return String(item.variant_id) === String(variantId)
              && item.properties
              && item.properties['_bundle_free_gift'] === 'true'
              && item.properties['_bundle_id'] === self.bundleId;
          });
          if (!giftItem) return;
          return fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              line: cart.items.indexOf(giftItem) + 1,
              quantity: 0,
            }),
          });
        })
        .then(function () {
          document.dispatchEvent(new CustomEvent('cart:updated'));
          document.dispatchEvent(new CustomEvent('cart:refresh'));
        });
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

    formatMoney(cents) {
      if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
        return Shopify.formatMoney(cents);
      }
      // Use shop money_format from Liquid if available
      if (this.moneyFormat) {
        var amount = (cents / 100).toFixed(2);
        var amountNoTrailing = parseFloat(amount).toString();
        return this.moneyFormat
          .replace(/\{\{\s*amount\s*\}\}/, amount)
          .replace(/\{\{\s*amount_no_decimals\s*\}\}/, Math.round(cents / 100))
          .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, amount.replace('.', ','))
          .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/, Math.round(cents / 100));
      }
      // Final fallback
      console.warn('[BundleBuilder] moneyFormat unavailable, falling back to $ prefix. Non-USD stores should check shop.money_format.');
      var fallbackAmount = (cents / 100).toFixed(2);
      return '$' + fallbackAmount;
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

      var activeTier = this.getActiveTier();
      var discountLabel = '';
      if (activeTier) {
        discountLabel = this.discountType === 'percentage'
          ? activeTier.discount + '% off'
          : this.formatMoney(activeTier.discount) + ' off';
      }

      var items = [];
      var bundleId = this.bundleId;
      var bundleName = this.bundleName;
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
        if (discountLabel) {
          lineItem.properties['_bundle_discount'] = discountLabel;
        }
        if (tierLabel) {
          lineItem.properties['_bundle_tier'] = tierLabel;
        }
        items.push(lineItem);
      });

      try {
        var response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: items }),
        });

        if (!response.ok) {
          var errorData = await response.json().catch(function () { return {}; });
          throw new Error(errorData.description || 'Failed to add to cart');
        }

        document.dispatchEvent(new CustomEvent('cart:updated'));
        document.dispatchEvent(new CustomEvent('cart:refresh'));
        document.dispatchEvent(new CustomEvent('ajaxProduct:added'));

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
