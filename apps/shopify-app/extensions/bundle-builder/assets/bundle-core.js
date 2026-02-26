/**
 * Bundle Core — Shared logic for bundle pricing, tier management,
 * cart API integration, and free gift management.
 * Used by both bundle-builder.js and bundle-pdp.js.
 */
(function () {
  'use strict';

  // Prevent double-init if loaded by multiple blocks on the same page
  if (window.BundleCore) return;

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
   * Get locale-aware route root.
   */
  BundleCore.routeRoot = function () {
    return (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  };

  /**
   * Update the theme's cart count bubble after cart changes.
   */
  BundleCore.refreshCartUI = function () {
    var root = BundleCore.routeRoot();
    // Fetch updated cart to get item count
    fetch(root + 'cart.js', { credentials: 'same-origin' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (cart) {
        if (!cart) return;
        // Update common cart count selectors used by Dawn and similar themes
        var selectors = ['.cart-count-bubble span', '[data-cart-count]', '.cart-count', '#cart-icon-bubble span[aria-hidden]', '.js-cart-count'];
        selectors.forEach(function (sel) {
          document.querySelectorAll(sel).forEach(function (el) {
            el.textContent = cart.item_count;
          });
        });
        // Show bubble if items exist
        var bubbles = document.querySelectorAll('.cart-count-bubble, #cart-icon-bubble');
        bubbles.forEach(function (b) {
          if (cart.item_count > 0) b.removeAttribute('hidden');
        });
      })
      .catch(function () { /* silent */ });

    // Dawn section rendering — target actual DOM elements (no shopify-section- prefix)
    fetch(root + '?sections=cart-drawer,cart-icon-bubble', { credentials: 'same-origin' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (sections) {
        if (!sections) return;
        var parser = new DOMParser();

        // Update cart drawer inner content
        if (sections['cart-drawer']) {
          var drawerTarget = document.getElementById('CartDrawer');
          if (drawerTarget) {
            var drawerDoc = parser.parseFromString(sections['cart-drawer'], 'text/html');
            var drawerContent = drawerDoc.getElementById('CartDrawer');
            if (drawerContent) drawerTarget.innerHTML = drawerContent.innerHTML;
          }
        }

        // Update cart icon bubble
        if (sections['cart-icon-bubble']) {
          var bubbleTarget = document.getElementById('cart-icon-bubble');
          if (bubbleTarget) {
            var bubbleDoc = parser.parseFromString(sections['cart-icon-bubble'], 'text/html');
            var bubbleContent = bubbleDoc.querySelector('.shopify-section');
            if (bubbleContent) bubbleTarget.innerHTML = bubbleContent.innerHTML;
          }
        }
      })
      .catch(function () { /* silent */ });

    document.dispatchEvent(new CustomEvent('cart:updated'));
    document.dispatchEvent(new CustomEvent('cart:refresh'));
  };

  /**
   * Open Dawn's cart drawer with fresh section data.
   * Uses cart-drawer's renderContents() which updates content AND opens the drawer.
   */
  BundleCore.openCartDrawer = function () {
    var cartDrawer = document.querySelector('cart-drawer');
    if (!cartDrawer || typeof cartDrawer.renderContents !== 'function') return;
    var root = BundleCore.routeRoot();
    fetch(root + '?sections=cart-drawer,cart-icon-bubble', { credentials: 'same-origin' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (sections) {
        if (sections) cartDrawer.renderContents({ id: null, sections: sections });
      })
      .catch(function () { /* silent */ });
  };

  /**
   * Add a free gift variant to the cart with bundle properties.
   * @param {string} variantId - Variant GID or numeric ID
   * @param {string} bundleId - Bundle identifier
   * @param {string} bundleName - Bundle display name
   * @param {number} [minItems] - Minimum qualifying items for this gift (for cart enforcement)
   * Returns a Promise that resolves to { added: boolean }.
   */
  BundleCore.addFreeGiftToCart = function (variantId, bundleId, bundleName, minItems) {
    var numericId = BundleCore.numericVariantId(variantId);
    var root = BundleCore.routeRoot();

    var properties = {
      '_bundle_id': bundleId,
      '_bundle_name': bundleName,
      '_bundle_free_gift': 'true',
    };
    if (minItems) {
      properties['_bundle_gift_min_items'] = String(minItems);
    }

    return fetch(root + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        items: [{
          id: numericId,
          quantity: 1,
          properties: properties,
        }],
      }),
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (err) {
          var desc = err.description || '';
          if (desc.indexOf('unavailable') !== -1 || desc.indexOf('not available') !== -1) {
            return { added: false, reason: 'unavailable' };
          }
          return { added: false, reason: 'error' };
        });
      }
      BundleCore.refreshCartUI();
      return { added: true };
    }).catch(function () {
      return { added: false, reason: 'error' };
    });
  };

  /**
   * Remove a free gift variant from the cart by matching bundle properties.
   * Returns a Promise.
   */
  BundleCore.removeFreeGiftFromCart = function (variantId, bundleId) {
    var numericId = BundleCore.numericVariantId(variantId);
    var root = BundleCore.routeRoot();

    return fetch(root + 'cart.js', { credentials: 'same-origin' })
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
        return fetch(root + 'cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            line: cart.items.indexOf(giftItem) + 1,
            quantity: 0,
          }),
        }).then(function (res) {
          if (!res.ok) throw new Error('Failed to remove free gift');
        });
      })
      .then(function () {
        BundleCore.refreshCartUI();
      });
  };

  /**
   * Add bundle items to cart.
   * Returns a Promise that resolves on success.
   */
  BundleCore.addBundleToCart = function (items) {
    var root = BundleCore.routeRoot();
    return fetch(root + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ items: items }),
    }).then(function (response) {
      if (!response.ok) {
        return response.json().catch(function () { return {}; }).then(function (err) {
          throw new Error(err.description || 'Failed to add to cart');
        });
      }
      BundleCore.refreshCartUI();
      document.dispatchEvent(new CustomEvent('ajaxProduct:added'));
      return response;
    });
  };

  /**
   * Audit the cart and enforce free gift rules:
   * 1. Remove free gifts whose bundle doesn't meet the minimum item threshold
   * 2. Cap free gift quantity to 1 (remove excess)
   * Runs on any page (cart page, etc.) without needing the bundle PDP.
   * Returns a Promise.
   */
  BundleCore.enforceFreeGifts = function () {
    if (BundleCore._pdpManagingGifts) return Promise.resolve();
    if (BundleCore._enforcing) return Promise.resolve();
    BundleCore._enforcing = true;
    var root = BundleCore.routeRoot();

    return fetch(root + 'cart.js', { credentials: 'same-origin' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (cart) {
        if (!cart || !cart.items) return;

        // Group non-gift items by bundle_id to count qualifying items
        var bundleCounts = {};
        var changes = []; // { key: string, quantity: number }

        cart.items.forEach(function (item) {
          var props = item.properties || {};
          var bid = props['_bundle_id'];
          if (!bid) return;

          if (props['_bundle_free_gift'] !== 'true') {
            bundleCounts[bid] = (bundleCounts[bid] || 0) + item.quantity;
          }
        });

        cart.items.forEach(function (item) {
          var props = item.properties || {};
          if (props['_bundle_free_gift'] !== 'true') return;

          var bid = props['_bundle_id'];
          var minItems = parseInt(props['_bundle_gift_min_items'], 10) || 0;
          var qualifyingCount = bundleCounts[bid] || 0;

          if (minItems > 0 && qualifyingCount < minItems) {
            // Below threshold — remove entirely
            changes.push({ key: item.key, quantity: 0 });
          } else if (item.quantity > 1) {
            // Cap at 1
            changes.push({ key: item.key, quantity: 1 });
          }
        });

        if (changes.length === 0) return;

        // Apply changes sequentially using line item keys
        var chain = Promise.resolve();
        changes.forEach(function (change) {
          chain = chain.then(function () {
            return fetch(root + 'cart/change.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({ id: change.key, quantity: change.quantity }),
            });
          });
        });

        return chain.then(function () {
          BundleCore.refreshCartUI();
        });
      })
      .catch(function () { /* silent */ })
      .then(function () { BundleCore._enforcing = false; });
  };

  /**
   * Start cart enforcement listener. Runs enforceFreeGifts on cart changes.
   * Should be called once on page load (any page).
   */
  BundleCore.initCartEnforcement = function () {
    if (BundleCore._enforcementInitialized) return;
    BundleCore._enforcementInitialized = true;

    // Run on initial page load
    BundleCore.enforceFreeGifts();

    // Listen for cart change events
    document.addEventListener('cart:updated', function () {
      // Debounce: wait 500ms after last cart change
      clearTimeout(BundleCore._enforceTimer);
      BundleCore._enforceTimer = setTimeout(function () {
        BundleCore.enforceFreeGifts();
      }, 500);
    });
  };

  /**
   * Fetch full product data for a variant ID via Storefront AJAX API.
   * Returns { product, variants, options } or null.
   * Results are cached to avoid re-fetching.
   */
  BundleCore._productCache = {};
  BundleCore.fetchProductForVariant = function (variantId) {
    var numericId = BundleCore.numericVariantId(variantId);
    var root = BundleCore.routeRoot();

    // Check cache by variant ID
    if (BundleCore._productCache[numericId]) {
      return Promise.resolve(BundleCore._productCache[numericId]);
    }

    return fetch(root + 'variants/' + numericId + '.js', { credentials: 'same-origin' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (variant) {
        if (!variant || !variant.product_id) return null;
        return fetch(root + 'products/' + variant.product_id + '.js', { credentials: 'same-origin' });
      })
      .then(function (res) {
        if (!res || typeof res.json !== 'function') return null;
        return res.ok ? res.json() : null;
      })
      .then(function (product) {
        if (!product) return null;
        var result = {
          product: product,
          variants: product.variants || [],
          options: product.options || [],
        };
        // Cache by all variant IDs of this product
        (product.variants || []).forEach(function (v) {
          BundleCore._productCache[v.id] = result;
        });
        return result;
      })
      .catch(function () { return null; });
  };

  window.BundleCore = BundleCore;
})();
