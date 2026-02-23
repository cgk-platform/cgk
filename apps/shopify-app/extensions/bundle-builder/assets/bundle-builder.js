/**
 * Bundle Builder — Vanilla JS
 * Handles product selection, tier-based pricing, quantity controls, and Shopify Cart API integration.
 */
(function () {
  'use strict';

  class BundleBuilder {
    constructor(section) {
      this.section = section;
      this.selectedProducts = new Map(); // variantId -> { productId, variantId, title, price, quantity }
      this.tiers = this.parseTiers();
      this.minItems = parseInt(section.dataset.minItems, 10) || 1;
      this.maxItems = parseInt(section.dataset.maxItems, 10) || 99;
      this.discountType = section.dataset.discountType || 'percentage';
      this.showSavings = section.dataset.showSavings === 'true';
      this.showTierProgress = section.dataset.showTierProgress === 'true';
      this.bundleName = section.dataset.bundleName || 'Bundle';
      this.bundleId = section.dataset.sectionId || 'bundle';
      this.isLoading = false;

      this.els = {
        cards: section.querySelectorAll('.bb-card'),
        tierSection: section.querySelector('.bb-tier'),
        tierLabel: section.querySelector('.bb-tier__label'),
        tierFill: section.querySelector('.bb-tier__fill'),
        tierHint: section.querySelector('.bb-tier__hint'),
        subtotal: section.querySelector('[data-summary="subtotal"]'),
        discount: section.querySelector('[data-summary="discount"]'),
        total: section.querySelector('[data-summary="total"]'),
        savings: section.querySelector('.bb-savings'),
        cta: section.querySelector('.bb-cta'),
        itemCount: section.querySelector('[data-summary="count"]'),
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

        // Reset quantity display to 1 (in case of reselect after deselect)
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
        return Math.round(subtotal * (tier.discount / 100));
      }
      // Fixed amount discount (in cents)
      return tier.discount;
    }

    recalculate() {
      var totalItems = this.getTotalItems();
      var subtotal = this.getSubtotal();
      var activeTier = this.getActiveTier();
      var nextTier = this.getNextTier();
      var discountAmount = this.calculateDiscount(subtotal, activeTier);
      var total = Math.max(0, subtotal - discountAmount);

      if (this.els.subtotal) {
        this.els.subtotal.textContent = this.formatMoney(subtotal);
      }

      if (this.els.discount) {
        this.els.discount.textContent = discountAmount > 0 ? '-' + this.formatMoney(discountAmount) : this.formatMoney(0);
        this.els.discount.closest('.bb-summary__row').style.display = discountAmount > 0 ? '' : 'none';
      }

      if (this.els.total) {
        this.els.total.textContent = this.formatMoney(total);
      }

      if (this.els.itemCount) {
        this.els.itemCount.textContent = totalItems;
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

      if (this.els.cta) {
        var canAdd = totalItems >= this.minItems && totalItems > 0;
        this.els.cta.disabled = !canAdd || this.isLoading;
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

      if (nextTier) {
        var needed = nextTier.count - totalItems;
        var progress;
        if (activeTier) {
          progress = ((totalItems - activeTier.count) / (nextTier.count - activeTier.count)) * 100;
        } else {
          progress = (totalItems / nextTier.count) * 100;
        }
        this.els.tierFill.style.width = Math.min(100, Math.max(0, progress)) + '%';

        var nextDiscountLabel = this.discountType === 'percentage'
          ? nextTier.discount + '% off'
          : this.formatMoney(nextTier.discount) + ' off';
        var nextName = nextTier.label ? nextTier.label + ' — ' + nextDiscountLabel : nextDiscountLabel;
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
    }

    formatMoney(cents) {
      if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
        return Shopify.formatMoney(cents);
      }
      var amount = (cents / 100).toFixed(2);
      return '$' + amount;
    }

    async addToCart() {
      if (this.isLoading || this.selectedProducts.size === 0) return;
      if (this.getTotalItems() < this.minItems) return;

      this.isLoading = true;
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

        // Dispatch custom event for theme integration
        document.dispatchEvent(new CustomEvent('cart:updated'));

        // Visual feedback
        var originalText = this.els.cta.textContent;
        this.els.cta.textContent = 'Added to Cart!';
        this.els.cta.classList.remove('bb-cta--loading');

        var self = this;
        setTimeout(function () {
          self.els.cta.textContent = originalText;
        }, 2000);
      } catch (err) {
        console.error('[BundleBuilder] Cart error:', err);
        this.els.cta.textContent = 'Error — Try Again';
        this.els.cta.classList.remove('bb-cta--loading');

        var ctaDefault = this.section.dataset.ctaText || 'Add Bundle to Cart';
        var self2 = this;
        setTimeout(function () {
          self2.els.cta.textContent = ctaDefault;
        }, 3000);
      } finally {
        this.isLoading = false;
        this.els.cta.disabled = false;
      }
    }
  }

  function init() {
    document.querySelectorAll('[data-bundle-builder]').forEach(function (el) {
      if (!el._bbInstance) {
        el._bbInstance = new BundleBuilder(el);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
