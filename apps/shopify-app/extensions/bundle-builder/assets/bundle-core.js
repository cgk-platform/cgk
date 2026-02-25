/**
 * Bundle Core — Shared logic for bundle pricing, tier management,
 * cart API integration, and free gift management.
 * Used by both bundle-builder.js and bundle-pdp.js.
 */
(function () {
  'use strict';

  var BundleCore = {};

  /**
   * Parse metafield config from a raw JSON string (data-metafield-config attribute).
   */
  BundleCore.parseMetafieldConfig = function (raw) {
    if (!raw) return null;
    try {
      var config = JSON.parse(raw);
      var bundle = config.bundles && config.bundles[0];
      if (!bundle) return null;
      var tiers = (bundle.tiers || []).sort(function (a, b) { return a.count - b.count; });
      return {
        bundleId: bundle.bundleId || '',
        discountType: bundle.discountType || 'percentage',
        tiers: tiers,
        freeGiftVariantIds: bundle.freeGiftVariantIds || [],
      };
    } catch (_e) {
      return null;
    }
  };

  /**
   * Parse tiers from a JSON data attribute string.
   */
  BundleCore.parseTiers = function (tiersData) {
    if (!tiersData) return [];
    try {
      var tiers = JSON.parse(tiersData);
      return tiers.sort(function (a, b) { return a.count - b.count; });
    } catch (_e) {
      return [];
    }
  };

  /**
   * Get the active (highest qualifying) tier for a given item count.
   */
  BundleCore.getActiveTier = function (tiers, totalItems) {
    for (var i = tiers.length - 1; i >= 0; i--) {
      if (totalItems >= tiers[i].count) {
        return tiers[i];
      }
    }
    return null;
  };

  /**
   * Get the index of the active tier.
   */
  BundleCore.getActiveTierIndex = function (tiers, totalItems) {
    for (var i = tiers.length - 1; i >= 0; i--) {
      if (totalItems >= tiers[i].count) {
        return i;
      }
    }
    return -1;
  };

  /**
   * Get the next tier to unlock.
   */
  BundleCore.getNextTier = function (tiers, totalItems) {
    for (var i = 0; i < tiers.length; i++) {
      if (totalItems < tiers[i].count) {
        return tiers[i];
      }
    }
    return null;
  };

  /**
   * Calculate discount amount for a given subtotal and tier.
   */
  BundleCore.calculateDiscount = function (subtotal, tier, discountType) {
    if (!tier) return 0;
    if (discountType === 'percentage') {
      var pct = Math.min(tier.discount, 100);
      return Math.round(subtotal * (pct / 100));
    }
    return Math.min(tier.discount, subtotal);
  };

  /**
   * Format cents to a money string using Shopify's formatMoney or a template.
   */
  BundleCore.formatMoney = function (cents, moneyFormat) {
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
      return Shopify.formatMoney(cents);
    }
    if (moneyFormat) {
      var amount = (cents / 100).toFixed(2);
      return moneyFormat
        .replace(/\{\{\s*amount\s*\}\}/, amount)
        .replace(/\{\{\s*amount_no_decimals\s*\}\}/, Math.round(cents / 100))
        .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, amount.replace('.', ','))
        .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/, Math.round(cents / 100));
    }
    return '$' + (cents / 100).toFixed(2);
  };

  /**
   * Compute target free gift variant IDs based on qualifying tiers (cumulative).
   * All tiers up to and including the active tier contribute their gifts.
   */
  BundleCore.getTargetGiftIds = function (tiers, activeTierIndex) {
    var ids = [];
    var seen = {};
    if (activeTierIndex < 0) return ids;
    for (var i = 0; i <= activeTierIndex; i++) {
      var tier = tiers[i];
      var giftIds = tier.freeGiftVariantIds || [];
      for (var j = 0; j < giftIds.length; j++) {
        var gid = giftIds[j];
        if (!seen[gid]) {
          seen[gid] = true;
          ids.push(gid);
        }
      }
    }
    return ids;
  };

  /**
   * Extract numeric variant ID from a Shopify GID or plain numeric string.
   */
  BundleCore.numericVariantId = function (variantId) {
    if (typeof variantId === 'string' && variantId.indexOf('gid://') === 0) {
      return parseInt(variantId.split('/').pop(), 10);
    }
    return parseInt(variantId, 10);
  };

  /**
   * Add a free gift variant to the cart with bundle properties.
   * Returns a Promise that resolves to { added: boolean }.
   */
  BundleCore.addFreeGiftToCart = function (variantId, bundleId, bundleName) {
    var numericId = BundleCore.numericVariantId(variantId);

    return fetch('/variants/' + numericId + '.js')
      .then(function (res) {
        if (!res.ok) throw new Error('Variant not found');
        return res.json();
      })
      .then(function (variant) {
        if (!variant.available) {
          return { added: false, reason: 'unavailable' };
        }
        return fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{
              id: numericId,
              quantity: 1,
              properties: {
                '_bundle_id': bundleId,
                '_bundle_name': bundleName,
                '_bundle_free_gift': 'true',
              },
            }],
          }),
        }).then(function (res) {
          if (!res.ok) throw new Error('Failed to add free gift');
          document.dispatchEvent(new CustomEvent('cart:updated'));
          document.dispatchEvent(new CustomEvent('cart:refresh'));
          return { added: true };
        });
      })
      .catch(function () {
        return { added: false, reason: 'error' };
      });
  };

  /**
   * Remove a free gift variant from the cart by matching bundle properties.
   * Returns a Promise.
   */
  BundleCore.removeFreeGiftFromCart = function (variantId, bundleId) {
    var numericId = BundleCore.numericVariantId(variantId);

    return fetch('/cart.js')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to fetch cart');
        return res.json();
      })
      .then(function (cart) {
        var giftItem = cart.items.find(function (item) {
          return String(item.variant_id) === String(numericId)
            && item.properties
            && item.properties['_bundle_free_gift'] === 'true'
            && item.properties['_bundle_id'] === bundleId;
        });
        if (!giftItem) return;
        return fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            line: cart.items.indexOf(giftItem) + 1,
            quantity: 0,
          }),
        }).then(function (res) {
          if (!res.ok) throw new Error('Failed to remove free gift');
        });
      })
      .then(function () {
        document.dispatchEvent(new CustomEvent('cart:updated'));
        document.dispatchEvent(new CustomEvent('cart:refresh'));
      });
  };

  /**
   * Add bundle items to cart.
   * Returns a Promise that resolves on success.
   */
  BundleCore.addBundleToCart = function (items) {
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items }),
    }).then(function (response) {
      if (!response.ok) {
        return response.json().catch(function () { return {}; }).then(function (err) {
          throw new Error(err.description || 'Failed to add to cart');
        });
      }
      document.dispatchEvent(new CustomEvent('cart:updated'));
      document.dispatchEvent(new CustomEvent('cart:refresh'));
      document.dispatchEvent(new CustomEvent('ajaxProduct:added'));
      return response;
    });
  };

  window.BundleCore = BundleCore;
})();
