import {
  DEFAULT_API_VERSION,
  createAdminClient,
  normalizeStoreDomain
} from "./chunk-W4RFSGMI.js";
import {
  getOrganizationIdForShop,
  getOrganizationShops,
  getShopInstallation,
  isShopActive,
  listAllInstallations,
  reactivateShopInstallation,
  recordShopInstallation,
  recordShopUninstallation,
  suspendShopInstallation
} from "./chunk-H57MJSLZ.js";
import "./chunk-U67V476Y.js";

// src/storefront.ts
function createStorefrontClient(config) {
  const storeDomain = normalizeStoreDomain(config.storeDomain);
  const apiVersion = config.apiVersion ?? DEFAULT_API_VERSION;
  const endpoint = `https://${storeDomain}/api/${apiVersion}/graphql.json`;
  async function query(graphqlQuery, variables) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": config.storefrontAccessToken
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables
      })
    });
    if (!response.ok) {
      throw new Error(`Storefront API error: ${response.status} ${response.statusText}`);
    }
    const json = await response.json();
    if (json.errors && json.errors.length > 0) {
      throw new Error(`Storefront API GraphQL error: ${json.errors[0]?.message ?? "Unknown error"}`);
    }
    return json.data;
  }
  return {
    storeDomain,
    apiVersion,
    query
  };
}

// src/graphql.ts
var storefrontClientInstance = null;
var adminClientInstance = null;
async function storefrontQuery(query, variables) {
  if (!storefrontClientInstance) {
    throw new Error("Storefront client not initialized. Call initStorefront() first.");
  }
  return storefrontClientInstance.query(query, variables);
}
async function adminQuery(query, variables) {
  if (!adminClientInstance) {
    throw new Error("Admin client not initialized. Call initAdmin() first.");
  }
  return adminClientInstance.query(query, variables);
}
function initStorefront(config) {
  storefrontClientInstance = createStorefrontClient(config);
  return storefrontClientInstance;
}
function initAdmin(config) {
  adminClientInstance = createAdminClient(config);
  return adminClientInstance;
}

// src/queries/products.ts
var STOREFRONT_PRODUCT_FRAGMENT = `
  fragment ProductFields on Product {
    id
    title
    handle
    description
    descriptionHtml
    vendor
    productType
    tags
    availableForSale
    createdAt
    updatedAt
    seo {
      title
      description
    }
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    featuredImage {
      id
      url(transform: { maxWidth: 800, maxHeight: 800 })
      altText
      width
      height
    }
    variants(first: 100) {
      edges {
        node {
          id
          title
          sku
          availableForSale
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
          selectedOptions { name value }
          image {
            id
            url(transform: { maxWidth: 800, maxHeight: 800 })
            altText
            width
            height
          }
        }
      }
    }
    images(first: 20) {
      edges {
        node {
          id
          url(transform: { maxWidth: 800, maxHeight: 800 })
          altText
          width
          height
        }
      }
    }
  }
`;
async function listProducts(client, params = {}) {
  const { first = 20, after, query, sortKey, reverse } = params;
  const result = await client.query(
    `
    ${STOREFRONT_PRODUCT_FRAGMENT}
    query Products($first: Int!, $after: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
      products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
        edges { node { ...ProductFields } }
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      }
    }
    `,
    { first, after, query, sortKey, reverse }
  );
  return {
    products: result.products.edges.map((edge) => edge.node),
    pageInfo: result.products.pageInfo
  };
}
async function getProductByHandle(client, handle) {
  const result = await client.query(
    `
    ${STOREFRONT_PRODUCT_FRAGMENT}
    query ProductByHandle($handle: String!) {
      product(handle: $handle) { ...ProductFields }
    }
    `,
    { handle }
  );
  return result.product;
}
async function getProductById(client, id) {
  const result = await client.query(
    `
    ${STOREFRONT_PRODUCT_FRAGMENT}
    query Product($id: ID!) {
      product(id: $id) { ...ProductFields }
    }
    `,
    { id }
  );
  return result.product;
}
var ADMIN_PRODUCT_FRAGMENT = `
  fragment AdminProductFields on Product {
    id
    title
    handle
    description
    descriptionHtml
    vendor
    productType
    tags
    status
    createdAt
    updatedAt
    totalInventory
    priceRangeV2 {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    variants(first: 100) {
      edges {
        node {
          id
          title
          sku
          price
          compareAtPrice
          inventoryQuantity
          selectedOptions { name value }
          image { id url altText width height }
        }
      }
    }
    images(first: 20) {
      edges {
        node { id url altText width height }
      }
    }
  }
`;
async function adminListProducts(client, params = {}) {
  const { first = 20, after, query, sortKey, reverse } = params;
  const result = await client.query(
    `
    ${ADMIN_PRODUCT_FRAGMENT}
    query Products($first: Int!, $after: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
      products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
        edges { node { ...AdminProductFields } }
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      }
    }
    `,
    { first, after, query, sortKey, reverse }
  );
  return {
    products: result.products.edges.map((edge) => edge.node),
    pageInfo: result.products.pageInfo
  };
}
async function adminGetProduct(client, id) {
  const result = await client.query(
    `
    ${ADMIN_PRODUCT_FRAGMENT}
    query Product($id: ID!) {
      product(id: $id) { ...AdminProductFields }
    }
    `,
    { id }
  );
  return result.product;
}
async function getProductRecommendations(client, productId) {
  const result = await client.query(
    `
    ${STOREFRONT_PRODUCT_FRAGMENT}
    query ProductRecommendations($productId: ID!) {
      productRecommendations(productId: $productId) {
        ...ProductFields
      }
    }
    `,
    { productId }
  );
  return result.productRecommendations ?? [];
}

// src/queries/orders.ts
var ORDER_FRAGMENT = `
  fragment OrderFields on Order {
    id
    name
    orderNumber: legacyResourceId
    email
    createdAt
    updatedAt
    fulfillmentStatus: displayFulfillmentStatus
    financialStatus: displayFinancialStatus
    totalPrice: totalPriceSet {
      shopMoney { amount currencyCode }
    }
    subtotalPrice: subtotalPriceSet {
      shopMoney { amount currencyCode }
    }
    totalTax: totalTaxSet {
      shopMoney { amount currencyCode }
    }
    totalShippingPrice: totalShippingPriceSet {
      shopMoney { amount currencyCode }
    }
    shippingAddress {
      firstName lastName address1 address2
      city province provinceCode country countryCode zip phone
    }
    billingAddress {
      firstName lastName address1 address2
      city province provinceCode country countryCode zip phone
    }
    lineItems(first: 100) {
      edges {
        node {
          id
          title
          quantity
          originalUnitPriceSet {
            shopMoney { amount currencyCode }
          }
          discountedTotalSet {
            shopMoney { amount currencyCode }
          }
          variant {
            id
            title
            sku
            price
            image { id url altText width height }
            selectedOptions { name value }
          }
        }
      }
    }
  }
`;
async function listOrders(client, params = {}) {
  const { first = 20, after, query, sortKey = "CREATED_AT", reverse = true } = params;
  const result = await client.query(
    `
    ${ORDER_FRAGMENT}
    query Orders($first: Int!, $after: String, $query: String, $sortKey: OrderSortKeys, $reverse: Boolean) {
      orders(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
        edges { node { ...OrderFields } }
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      }
    }
    `,
    { first, after, query, sortKey, reverse }
  );
  return {
    orders: result.orders.edges.map((edge) => edge.node),
    pageInfo: result.orders.pageInfo
  };
}
async function getOrder(client, id) {
  const result = await client.query(
    `
    ${ORDER_FRAGMENT}
    query Order($id: ID!) {
      order(id: $id) { ...OrderFields }
    }
    `,
    { id }
  );
  return result.order;
}

// src/queries/customers.ts
var CUSTOMER_FRAGMENT = `
  fragment CustomerFields on Customer {
    id
    email
    firstName
    lastName
    phone
    createdAt
    updatedAt
    defaultAddress {
      firstName lastName address1 address2
      city province provinceCode country countryCode zip phone
    }
    addresses(first: 10) {
      edges {
        node {
          firstName lastName address1 address2
          city province provinceCode country countryCode zip phone
        }
      }
    }
  }
`;
async function listCustomers(client, params = {}) {
  const { first = 20, after, query, sortKey = "CREATED_AT", reverse = true } = params;
  const result = await client.query(
    `
    ${CUSTOMER_FRAGMENT}
    query Customers($first: Int!, $after: String, $query: String, $sortKey: CustomerSortKeys, $reverse: Boolean) {
      customers(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
        edges { node { ...CustomerFields } }
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      }
    }
    `,
    { first, after, query, sortKey, reverse }
  );
  return {
    customers: result.customers.edges.map((edge) => edge.node),
    pageInfo: result.customers.pageInfo
  };
}
async function getCustomer(client, id) {
  const result = await client.query(
    `
    ${CUSTOMER_FRAGMENT}
    query Customer($id: ID!) {
      customer(id: $id) { ...CustomerFields }
    }
    `,
    { id }
  );
  return result.customer;
}
async function getCustomerOrders(client, customerId, params = {}) {
  const { first = 20, after } = params;
  const result = await client.query(
    `
    query CustomerOrders($id: ID!, $first: Int!, $after: String) {
      customer(id: $id) {
        orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              name
              createdAt
              updatedAt
              displayFulfillmentStatus
              displayFinancialStatus
              totalPriceSet {
                shopMoney { amount currencyCode }
              }
              lineItems(first: 10) {
                edges {
                  node { id title quantity }
                }
              }
            }
          }
          pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
        }
      }
    }
    `,
    { id: customerId, first, after }
  );
  if (!result.customer) {
    return { orders: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null } };
  }
  return {
    orders: result.customer.orders.edges.map((edge) => edge.node),
    pageInfo: result.customer.orders.pageInfo
  };
}

// src/queries/cart.ts
var CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    createdAt
    updatedAt
    attributes {
      key
      value
    }
    discountCodes {
      code
      applicable
    }
    discountAllocations {
      discountedAmount {
        amount
        currencyCode
      }
    }
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              product { id title handle }
              price { amount currencyCode }
              image { url altText }
              selectedOptions { name value }
            }
          }
          cost {
            amountPerQuantity { amount currencyCode }
            totalAmount { amount currencyCode }
            compareAtAmountPerQuantity { amount currencyCode }
          }
          discountAllocations {
            discountedAmount {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;
async function createCart(client) {
  const result = await client.query(
    `
    ${CART_FRAGMENT}
    mutation CartCreate {
      cartCreate {
        cart { ...CartFields }
        userErrors { code field message }
      }
    }
    `
  );
  const userErrors = result.cartCreate?.userErrors;
  if (userErrors && userErrors.length > 0) {
    throw new Error(userErrors[0]?.message ?? "Failed to create cart");
  }
  if (!result.cartCreate?.cart) {
    throw new Error("Failed to create cart");
  }
  return result.cartCreate.cart;
}
async function getCart(client, cartId) {
  const result = await client.query(
    `
    ${CART_FRAGMENT}
    query Cart($cartId: ID!) {
      cart(id: $cartId) { ...CartFields }
    }
    `,
    { cartId }
  );
  return result.cart ?? null;
}
async function addCartLines(client, cartId, lines) {
  const result = await client.query(
    `
    ${CART_FRAGMENT}
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
        userErrors { code field message }
      }
    }
    `,
    { cartId, lines }
  );
  const userErrors = result.cartLinesAdd?.userErrors;
  if (userErrors && userErrors.length > 0) {
    throw new Error(userErrors[0]?.message ?? "Failed to add cart lines");
  }
  if (!result.cartLinesAdd?.cart) {
    throw new Error("Failed to add cart lines");
  }
  return result.cartLinesAdd.cart;
}
async function updateCartLines(client, cartId, lines) {
  const result = await client.query(
    `
    ${CART_FRAGMENT}
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
        userErrors { code field message }
      }
    }
    `,
    { cartId, lines }
  );
  const userErrors = result.cartLinesUpdate?.userErrors;
  if (userErrors && userErrors.length > 0) {
    throw new Error(userErrors[0]?.message ?? "Failed to update cart lines");
  }
  if (!result.cartLinesUpdate?.cart) {
    throw new Error("Failed to update cart lines");
  }
  return result.cartLinesUpdate.cart;
}
async function removeCartLines(client, cartId, lineIds) {
  const result = await client.query(
    `
    ${CART_FRAGMENT}
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ...CartFields }
        userErrors { code field message }
      }
    }
    `,
    { cartId, lineIds }
  );
  const userErrors = result.cartLinesRemove?.userErrors;
  if (userErrors && userErrors.length > 0) {
    throw new Error(userErrors[0]?.message ?? "Failed to remove cart lines");
  }
  if (!result.cartLinesRemove?.cart) {
    throw new Error("Failed to remove cart lines");
  }
  return result.cartLinesRemove.cart;
}
async function updateCartAttributes(client, cartId, attributes) {
  const result = await client.query(
    `
    ${CART_FRAGMENT}
    mutation CartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!) {
      cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
        cart { ...CartFields }
        userErrors { code field message }
      }
    }
    `,
    { cartId, attributes }
  );
  const userErrors = result.cartAttributesUpdate?.userErrors;
  if (userErrors && userErrors.length > 0) {
    throw new Error(userErrors[0]?.message ?? "Failed to update cart attributes");
  }
  if (!result.cartAttributesUpdate?.cart) {
    throw new Error("Failed to update cart attributes");
  }
  return result.cartAttributesUpdate.cart;
}
async function applyCartDiscountCodes(client, cartId, discountCodes) {
  const result = await client.query(
    `
    ${CART_FRAGMENT}
    mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
      cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
        cart { ...CartFields }
        userErrors { code field message }
      }
    }
    `,
    { cartId, discountCodes }
  );
  const discountErrors = result.cartDiscountCodesUpdate?.userErrors;
  if (discountErrors && discountErrors.length > 0) {
    throw new Error(discountErrors[0]?.message ?? "Failed to apply discount code");
  }
  if (!result.cartDiscountCodesUpdate?.cart) {
    throw new Error("Failed to apply discount code");
  }
  return result.cartDiscountCodesUpdate.cart;
}
async function removeCartDiscountCodes(client, cartId) {
  return applyCartDiscountCodes(client, cartId, []);
}
async function updateCartBuyerIdentity(client, cartId, buyerIdentity) {
  const result = await client.query(
    `
    ${CART_FRAGMENT}
    mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
      cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
        cart { ...CartFields }
        userErrors { code field message }
      }
    }
    `,
    { cartId, buyerIdentity }
  );
  const userErrors = result.cartBuyerIdentityUpdate?.userErrors;
  if (userErrors && userErrors.length > 0) {
    throw new Error(userErrors[0]?.message ?? "Failed to update cart buyer identity");
  }
  if (!result.cartBuyerIdentityUpdate?.cart) {
    throw new Error("Failed to update cart buyer identity");
  }
  return result.cartBuyerIdentityUpdate.cart;
}

// src/queries/collections.ts
var COLLECTION_FRAGMENT = `
  fragment CollectionFields on Collection {
    id
    title
    handle
    description
    descriptionHtml
    image {
      id
      url
      altText
      width
      height
    }
  }
`;
var COLLECTION_PRODUCT_FRAGMENT = `
  fragment CollectionProductFields on Product {
    id
    title
    handle
    description
    descriptionHtml
    vendor
    productType
    tags
    availableForSale
    createdAt
    updatedAt
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    variants(first: 100) {
      edges {
        node {
          id
          title
          sku
          availableForSale
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
          selectedOptions { name value }
          image { id url altText width height }
        }
      }
    }
    images(first: 20) {
      edges {
        node { id url altText width height }
      }
    }
  }
`;
async function listCollections(client, params = {}) {
  const { first = 20, after, query, sortKey, reverse } = params;
  const result = await client.query(
    `
    ${COLLECTION_FRAGMENT}
    query Collections($first: Int!, $after: String, $query: String, $sortKey: CollectionSortKeys, $reverse: Boolean) {
      collections(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
        edges { node { ...CollectionFields } }
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      }
    }
    `,
    { first, after, query, sortKey, reverse }
  );
  return {
    collections: result.collections.edges.map((edge) => edge.node),
    pageInfo: result.collections.pageInfo
  };
}
async function getCollectionByHandle(client, handle) {
  const result = await client.query(
    `
    ${COLLECTION_FRAGMENT}
    query CollectionByHandle($handle: String!) {
      collection(handle: $handle) { ...CollectionFields }
    }
    `,
    { handle }
  );
  return result.collection;
}
async function getCollectionProducts(client, handle, params = {}) {
  const { first = 20, after, filters, sortKey, reverse } = params;
  const shopifyFilters = filters?.map((f) => {
    if (f.variantOption) {
      return { variantOption: f.variantOption };
    }
    if (f.price) {
      return { price: f.price };
    }
    if (f.available !== void 0) {
      return { available: f.available };
    }
    if (f.productType) {
      return { productType: f.productType };
    }
    if (f.tag) {
      return { tag: f.tag };
    }
    return {};
  });
  const result = await client.query(
    `
    ${COLLECTION_PRODUCT_FRAGMENT}
    query CollectionProducts(
      $handle: String!,
      $first: Int!,
      $after: String,
      $filters: [ProductFilter!],
      $sortKey: ProductCollectionSortKeys,
      $reverse: Boolean
    ) {
      collection(handle: $handle) {
        products(first: $first, after: $after, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
          edges { node { ...CollectionProductFields } }
          pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
          filters {
            id
            label
            type
            values {
              id
              label
              count
              input
            }
          }
        }
      }
    }
    `,
    { handle, first, after, filters: shopifyFilters, sortKey, reverse }
  );
  if (!result.collection) return null;
  return {
    products: result.collection.products.edges.map((edge) => edge.node),
    pageInfo: result.collection.products.pageInfo,
    filters: result.collection.products.filters
  };
}

// src/queries/search.ts
async function predictiveSearch(client, params) {
  const { query, types = ["PRODUCT", "COLLECTION", "QUERY"], limit = 4 } = params;
  const result = await client.query(
    `
    query PredictiveSearch($query: String!, $types: [PredictiveSearchType!], $limit: Int!) {
      predictiveSearch(query: $query, types: $types, limit: $limit) {
        products {
          id
          title
          handle
          description
          descriptionHtml
          vendor
          productType
          tags
          availableForSale
          createdAt
          updatedAt
          priceRange {
            minVariantPrice { amount currencyCode }
            maxVariantPrice { amount currencyCode }
          }
          variants(first: 1) {
            edges {
              node {
                id
                title
                sku
                availableForSale
                price { amount currencyCode }
                compareAtPrice { amount currencyCode }
                selectedOptions { name value }
                image { id url altText width height }
              }
            }
          }
          images(first: 1) {
            edges {
              node { id url altText width height }
            }
          }
        }
        collections {
          id
          title
          handle
          description
          descriptionHtml
          image { id url altText width height }
        }
        queries {
          text
          styledText
        }
      }
    }
    `,
    { query, types, limit }
  );
  return result.predictiveSearch;
}
async function searchProducts(client, params) {
  const { query, first = 20, after, sortKey, reverse, productFilters } = params;
  const result = await client.query(
    `
    query Search(
      $query: String!,
      $first: Int!,
      $after: String,
      $sortKey: SearchSortKeys,
      $reverse: Boolean,
      $productFilters: [ProductFilter!]
    ) {
      search(
        query: $query,
        types: PRODUCT,
        first: $first,
        after: $after,
        sortKey: $sortKey,
        reverse: $reverse,
        productFilters: $productFilters
      ) {
        edges {
          node {
            ... on Product {
              id
              title
              handle
              description
              descriptionHtml
              vendor
              productType
              tags
              availableForSale
              createdAt
              updatedAt
              priceRange {
                minVariantPrice { amount currencyCode }
                maxVariantPrice { amount currencyCode }
              }
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    sku
                    availableForSale
                    price { amount currencyCode }
                    compareAtPrice { amount currencyCode }
                    selectedOptions { name value }
                    image { id url altText width height }
                  }
                }
              }
              images(first: 20) {
                edges {
                  node { id url altText width height }
                }
              }
            }
          }
        }
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
        totalCount
        productFilters {
          id
          label
          type
          values {
            id
            label
            count
            input
          }
        }
      }
    }
    `,
    { query, first, after, sortKey, reverse, productFilters }
  );
  return {
    products: result.search.edges.map((edge) => edge.node),
    pageInfo: result.search.pageInfo,
    totalCount: result.search.totalCount,
    filters: result.search.productFilters
  };
}

// src/queries/shop.ts
async function getShop(client) {
  const result = await client.query(
    `
    query Shop {
      shop {
        name
        description
        primaryDomain {
          url
          host
        }
        paymentSettings {
          currencyCode
          acceptedCardBrands
          enabledPresentmentCurrencies
        }
        brand {
          logo {
            image {
              url
              altText
              width
              height
            }
          }
          slogan
          shortDescription
          colors {
            primary { background foreground }
            secondary { background foreground }
          }
        }
      }
    }
    `
  );
  return result.shop;
}
async function getShopPolicies(client) {
  const result = await client.query(
    `
    query ShopPolicies {
      shop {
        privacyPolicy {
          title
          body
          handle
        }
        termsOfService {
          title
          body
          handle
        }
        shippingPolicy {
          title
          body
          handle
        }
        refundPolicy {
          title
          body
          handle
        }
      }
    }
    `
  );
  return result.shop;
}
async function getMenu(client, handle) {
  const result = await client.query(
    `
    query Menu($handle: String!) {
      menu(handle: $handle) {
        id
        handle
        title
        items {
          id
          title
          url
          type
          resourceId
          items {
            id
            title
            url
            type
            resourceId
            items {
              id
              title
              url
              type
              resourceId
            }
          }
        }
      }
    }
    `,
    { handle }
  );
  return result.menu;
}

// src/queries/metafields.ts
async function getProductMetafields(client, handle, identifiers) {
  const result = await client.query(
    `
    query ProductMetafields($handle: String!, $identifiers: [HasMetafieldsIdentifier!]!) {
      product(handle: $handle) {
        metafields(identifiers: $identifiers) {
          namespace
          key
          value
          type
        }
      }
    }
    `,
    { handle, identifiers }
  );
  if (!result.product) return [];
  return result.product.metafields.filter((m) => m !== null);
}
async function getCollectionMetafield(client, handle, namespace, key) {
  const result = await client.query(
    `
    query CollectionMetafield($handle: String!, $namespace: String!, $key: String!) {
      collection(handle: $handle) {
        metafield(namespace: $namespace, key: $key) {
          namespace
          key
          value
          type
        }
      }
    }
    `,
    { handle, namespace, key }
  );
  return result.collection?.metafield ?? null;
}

// src/queries/blog.ts
var ARTICLE_FRAGMENT = `
  fragment ArticleFields on Article {
    id
    handle
    title
    excerpt
    excerptHtml
    contentHtml
    publishedAt
    image {
      url
      altText
      width
      height
    }
    authorV2 {
      name
      bio
    }
    blog {
      handle
      title
    }
    tags
    seo {
      title
      description
    }
  }
`;
async function getBlogArticles(client, blogHandle = "news", first = 12, after) {
  const result = await client.query(
    `
    ${ARTICLE_FRAGMENT}
    query BlogArticles($handle: String!, $first: Int!, $after: String) {
      blog(handle: $handle) {
        id
        handle
        title
        articles(first: $first, after: $after, sortKey: PUBLISHED_AT, reverse: true) {
          edges {
            node {
              ...ArticleFields
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
    `,
    { handle: blogHandle, first, after }
  );
  return result.blog;
}
async function getArticleByHandle(client, blogHandle, articleHandle) {
  const result = await client.query(
    `
    ${ARTICLE_FRAGMENT}
    query ArticleByHandle($blogHandle: String!, $articleHandle: String!) {
      blog(handle: $blogHandle) {
        articleByHandle(handle: $articleHandle) {
          ...ArticleFields
        }
      }
    }
    `,
    { blogHandle, articleHandle }
  );
  return result.blog?.articleByHandle ?? null;
}

// src/webhooks.ts
import { createHmac } from "crypto";
function verifyWebhook(body, hmacHeader, secret) {
  const bodyBuffer = typeof body === "string" ? Buffer.from(body, "utf8") : body;
  const hmac = createHmac("sha256", secret);
  hmac.update(bodyBuffer);
  const calculatedHmac = hmac.digest("base64");
  if (calculatedHmac.length !== hmacHeader.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < calculatedHmac.length; i++) {
    result |= calculatedHmac.charCodeAt(i) ^ hmacHeader.charCodeAt(i);
  }
  return result === 0;
}
function parseWebhook(body, topic, shop) {
  return {
    topic,
    shop,
    body: JSON.parse(body)
  };
}

// src/oauth/errors.ts
var ShopifyError = class extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "ShopifyError";
  }
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
};

// src/oauth/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
var ALGORITHM = "aes-256-gcm";
var IV_LENGTH = 12;
var AUTH_TAG_LENGTH = 16;
function getEncryptionKey() {
  const keyHex = process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new ShopifyError(
      "MISSING_CONFIG",
      "SHOPIFY_TOKEN_ENCRYPTION_KEY environment variable is required"
    );
  }
  if (keyHex.length !== 64) {
    throw new ShopifyError(
      "MISSING_CONFIG",
      "SHOPIFY_TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex characters)"
    );
  }
  return Buffer.from(keyHex, "hex");
}
function encryptToken(token) {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    if (error instanceof ShopifyError) {
      throw error;
    }
    throw new ShopifyError(
      "ENCRYPTION_FAILED",
      "Failed to encrypt token",
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}
function decryptToken(encrypted) {
  try {
    const key = getEncryptionKey();
    const parts = encrypted.split(":");
    if (parts.length !== 3) {
      throw new ShopifyError(
        "DECRYPTION_FAILED",
        "Invalid encrypted token format"
      );
    }
    const [ivHex, authTagHex, cipherText] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    if (iv.length !== IV_LENGTH) {
      throw new ShopifyError(
        "DECRYPTION_FAILED",
        "Invalid IV length in encrypted token"
      );
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new ShopifyError(
        "DECRYPTION_FAILED",
        "Invalid auth tag length in encrypted token"
      );
    }
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(cipherText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    if (error instanceof ShopifyError) {
      throw error;
    }
    throw new ShopifyError(
      "DECRYPTION_FAILED",
      "Failed to decrypt token",
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}
function generateSecureToken(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

// src/oauth/scopes.ts
var COMMERCE_SCOPES = [
  "read_orders",
  "write_orders",
  "read_draft_orders",
  "write_draft_orders",
  "read_checkouts",
  "write_checkouts",
  "read_customers",
  "write_customers",
  "read_customer_payment_methods"
];
var PRODUCT_SCOPES = [
  "read_products",
  "write_products",
  "read_inventory",
  "write_inventory",
  "read_product_listings",
  "read_publications",
  "read_product_feeds",
  "write_product_feeds"
];
var FULFILLMENT_SCOPES = [
  "read_fulfillments",
  "write_fulfillments",
  "read_shipping",
  "write_shipping",
  "read_locations",
  "read_merchant_managed_fulfillment_orders",
  "write_merchant_managed_fulfillment_orders",
  "read_third_party_fulfillment_orders",
  "write_third_party_fulfillment_orders",
  "read_assigned_fulfillment_orders",
  "write_assigned_fulfillment_orders"
];
var MARKETING_SCOPES = [
  "read_discounts",
  "write_discounts",
  "read_price_rules",
  "write_price_rules",
  "read_marketing_events",
  "write_marketing_events"
];
var GIFT_CARD_SCOPES = [
  "read_gift_cards",
  "write_gift_cards"
];
var CONTENT_SCOPES = [
  "read_content",
  "write_content",
  "read_themes",
  "write_themes",
  "read_locales"
];
var ANALYTICS_SCOPES = [
  "write_pixels",
  "read_customer_events",
  "read_analytics",
  "read_reports"
];
var MARKETS_SCOPES = [
  "read_markets",
  "write_markets"
];
var SUBSCRIPTION_SCOPES = [
  "read_own_subscription_contracts",
  "write_own_subscription_contracts",
  "read_customer_merge"
];
var FILE_SCOPES = [
  "read_files",
  "write_files"
];
var STORE_SCOPES = [
  "read_shop",
  "read_legal_policies"
];
var PLATFORM_SCOPES = [
  ...COMMERCE_SCOPES,
  ...PRODUCT_SCOPES,
  ...FULFILLMENT_SCOPES,
  ...MARKETING_SCOPES,
  ...GIFT_CARD_SCOPES,
  ...CONTENT_SCOPES,
  ...ANALYTICS_SCOPES,
  ...MARKETS_SCOPES,
  ...SUBSCRIPTION_SCOPES,
  ...FILE_SCOPES,
  ...STORE_SCOPES
];
function getScopesString() {
  return PLATFORM_SCOPES.join(",");
}
function validateScopes(grantedScopes) {
  const grantedSet = new Set(grantedScopes);
  const missing = [];
  const criticalScopes = [
    "read_orders",
    "read_products",
    "read_customers",
    "read_shop"
  ];
  for (const scope of criticalScopes) {
    if (!grantedSet.has(scope)) {
      missing.push(scope);
    }
  }
  return {
    valid: missing.length === 0,
    missing
  };
}

// src/oauth/validation.ts
import { createHmac as createHmac2, timingSafeEqual } from "crypto";
var SHOP_DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
function isValidShopDomain(shop) {
  return SHOP_DOMAIN_REGEX.test(shop);
}
function validateShopDomain(shop) {
  if (!isValidShopDomain(shop)) {
    throw new ShopifyError(
      "INVALID_SHOP",
      `Invalid Shopify shop domain: ${shop}. Must be a valid .myshopify.com domain.`
    );
  }
}
function normalizeShopDomain(shop) {
  let normalized = shop.replace(/^https?:\/\//, "");
  normalized = normalized.replace(/\/$/, "");
  if (!normalized.includes(".myshopify.com")) {
    normalized = `${normalized}.myshopify.com`;
  }
  return normalized.toLowerCase();
}
function verifyOAuthHmac(params, hmac, clientSecret) {
  const entries = Object.entries(params).filter(([key]) => key !== "hmac" && key !== "signature").sort(([a], [b]) => a.localeCompare(b));
  const queryString = entries.map(([key, value]) => `${key}=${value}`).join("&");
  const calculatedHmac = createHmac2("sha256", clientSecret).update(queryString).digest("hex");
  try {
    const hmacBuffer = Buffer.from(hmac, "hex");
    const calculatedBuffer = Buffer.from(calculatedHmac, "hex");
    if (hmacBuffer.length !== calculatedBuffer.length) {
      return false;
    }
    return timingSafeEqual(hmacBuffer, calculatedBuffer);
  } catch {
    return false;
  }
}
function verifyWebhookHmac(body, hmac, secret) {
  const bodyBuffer = typeof body === "string" ? Buffer.from(body, "utf8") : body;
  const calculatedHmac = createHmac2("sha256", secret).update(bodyBuffer).digest("base64");
  try {
    const hmacBuffer = Buffer.from(hmac, "base64");
    const calculatedBuffer = Buffer.from(calculatedHmac, "base64");
    if (hmacBuffer.length !== calculatedBuffer.length) {
      return false;
    }
    return timingSafeEqual(hmacBuffer, calculatedBuffer);
  } catch {
    return false;
  }
}
function isValidOAuthTimestamp(timestamp) {
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) {
    return false;
  }
  const now = Math.floor(Date.now() / 1e3);
  const fiveMinutes = 5 * 60;
  return Math.abs(now - ts) <= fiveMinutes;
}

// src/oauth/initiate.ts
import { sql } from "@cgk-platform/db";
function getShopifyClientId() {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  if (!clientId) {
    throw new ShopifyError("MISSING_CONFIG", "SHOPIFY_CLIENT_ID environment variable is required");
  }
  return clientId;
}
function buildShopifyAuthUrl(params) {
  const { shop, clientId, scopes, redirectUri, state } = params;
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}
async function initiateOAuth(params) {
  const { tenantId, shop: rawShop, redirectUri } = params;
  const shop = normalizeShopDomain(rawShop);
  validateShopDomain(shop);
  const state = generateSecureToken(32);
  const nonce = generateSecureToken(16);
  await sql`
    DELETE FROM public.shopify_oauth_states
    WHERE expires_at < NOW()
  `;
  await sql`
    DELETE FROM public.shopify_oauth_states
    WHERE shop = ${shop}
  `;
  await sql`
    INSERT INTO public.shopify_oauth_states (
      tenant_id,
      shop,
      state,
      nonce,
      redirect_uri,
      expires_at
    )
    VALUES (
      ${tenantId},
      ${shop},
      ${state},
      ${nonce},
      ${redirectUri},
      NOW() + INTERVAL '10 minutes'
    )
  `;
  const authUrl = buildShopifyAuthUrl({
    shop,
    clientId: getShopifyClientId(),
    scopes: getScopesString(),
    redirectUri,
    state
  });
  return authUrl;
}
async function getOAuthState(state) {
  const result = await sql`
    SELECT tenant_id, shop, nonce, redirect_uri
    FROM public.shopify_oauth_states
    WHERE state = ${state}
    AND expires_at > NOW()
  `;
  if (result.rows.length === 0) {
    return null;
  }
  const row = result.rows[0];
  return {
    tenantId: row.tenant_id,
    shop: row.shop,
    nonce: row.nonce,
    redirectUri: row.redirect_uri
  };
}
async function deleteOAuthState(state) {
  await sql`
    DELETE FROM public.shopify_oauth_states
    WHERE state = ${state}
  `;
}

// src/oauth/callback.ts
import { sql as sql2, withTenant } from "@cgk-platform/db";
function getShopifyClientId2() {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  if (!clientId) {
    throw new ShopifyError("MISSING_CONFIG", "SHOPIFY_CLIENT_ID environment variable is required");
  }
  return clientId;
}
function getShopifyClientSecret() {
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientSecret) {
    throw new ShopifyError(
      "MISSING_CONFIG",
      "SHOPIFY_CLIENT_SECRET environment variable is required"
    );
  }
  return clientSecret;
}
function getApiVersion() {
  return process.env.SHOPIFY_API_VERSION || "2026-01";
}
async function exchangeCodeForToken(params) {
  const { shop, code, clientId, clientSecret } = params;
  const url = `https://${shop}/admin/oauth/access_token`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new ShopifyError(
      "TOKEN_EXCHANGE_FAILED",
      `Failed to exchange code for token: ${response.status}`,
      { error: errorText }
    );
  }
  const data = await response.json();
  if (!data.access_token) {
    throw new ShopifyError("TOKEN_EXCHANGE_FAILED", "No access token in response");
  }
  return data;
}
async function handleOAuthCallback(params) {
  const { shop: rawShop, code, state, hmac, timestamp, host } = params;
  const shop = normalizeShopDomain(rawShop);
  const verifyParams = {
    code,
    shop,
    state,
    timestamp
  };
  if (host) {
    verifyParams.host = host;
  }
  const clientSecret = getShopifyClientSecret();
  if (!verifyOAuthHmac(verifyParams, hmac, clientSecret)) {
    throw new ShopifyError("INVALID_HMAC", "OAuth signature verification failed");
  }
  const oauthState = await getOAuthState(state);
  if (!oauthState) {
    throw new ShopifyError("INVALID_STATE", "OAuth state expired or invalid");
  }
  const { tenantId, shop: expectedShop } = oauthState;
  if (shop !== expectedShop) {
    throw new ShopifyError(
      "SHOP_MISMATCH",
      `Shop domain mismatch: expected ${expectedShop}, got ${shop}`
    );
  }
  const tokenResponse = await exchangeCodeForToken({
    shop,
    code,
    clientId: getShopifyClientId2(),
    clientSecret
  });
  const accessTokenEncrypted = encryptToken(tokenResponse.access_token);
  const webhookSecretEncrypted = encryptToken(clientSecret);
  const scopes = tokenResponse.scope.split(",").filter(Boolean);
  const scopesArrayLiteral = `{${scopes.join(",")}}`;
  const apiVersion = getApiVersion();
  const tenantResult = await sql2`SELECT slug FROM public.organizations WHERE id = ${tenantId}`;
  if (tenantResult.rows.length === 0) {
    throw new ShopifyError("INVALID_STATE", `Tenant ${tenantId} not found`);
  }
  const tenantSlug = tenantResult.rows[0].slug;
  await withTenant(tenantSlug, async () => {
    await sql2`
      INSERT INTO shopify_connections (
        tenant_id,
        shop,
        access_token_encrypted,
        webhook_secret_encrypted,
        scopes,
        api_version,
        status,
        installed_at,
        updated_at
      )
      VALUES (
        ${tenantId},
        ${shop},
        ${accessTokenEncrypted},
        ${webhookSecretEncrypted},
        ${scopesArrayLiteral}::TEXT[],
        ${apiVersion},
        'active',
        NOW(),
        NOW()
      )
      ON CONFLICT (tenant_id, shop) DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        webhook_secret_encrypted = EXCLUDED.webhook_secret_encrypted,
        scopes = EXCLUDED.scopes,
        api_version = EXCLUDED.api_version,
        status = 'active',
        updated_at = NOW()
    `;
  });
  const { recordShopInstallation: recordShopInstallation2 } = await import("./tenant-resolution-YBJ67SZE.js");
  await recordShopInstallation2({
    shop,
    organizationId: tenantId,
    scopes,
    shopifyAppId: null
    // Shopify doesn't provide this in OAuth response
  });
  try {
    const storefrontTokenResponse = await fetch(
      `https://${shop}/admin/api/${apiVersion}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": tokenResponse.access_token
        },
        body: JSON.stringify({
          query: `
          mutation {
            storefrontAccessTokenCreate(input: {
              title: "CGK Headless Storefront"
            }) {
              storefrontAccessToken {
                accessToken
                title
              }
              userErrors {
                field
                message
              }
            }
          }
        `
        })
      }
    );
    if (storefrontTokenResponse.ok) {
      const storefrontResult = await storefrontTokenResponse.json();
      if (storefrontResult.data?.storefrontAccessTokenCreate?.storefrontAccessToken) {
        const storefrontToken = storefrontResult.data.storefrontAccessTokenCreate.storefrontAccessToken.accessToken;
        const storefrontTokenEncrypted = encryptToken(storefrontToken);
        await withTenant(tenantSlug, async () => {
          await sql2`
            UPDATE shopify_connections
            SET storefront_api_token_encrypted = ${storefrontTokenEncrypted},
                updated_at = NOW()
            WHERE tenant_id = ${tenantId} AND shop = ${shop}
          `;
        });
      } else if (storefrontResult.data?.storefrontAccessTokenCreate?.userErrors?.length) {
        console.error(
          "Storefront token creation errors:",
          storefrontResult.data.storefrontAccessTokenCreate.userErrors
        );
      }
    }
  } catch (error) {
    console.error("Failed to create Storefront Access Token:", error);
  }
  await deleteOAuthState(state);
  return { tenantId, shop };
}
async function disconnectStore(tenantSlug, shop) {
  const tenantResult = await sql2`SELECT id FROM public.organizations WHERE slug = ${tenantSlug}`;
  if (tenantResult.rows.length === 0) {
    throw new ShopifyError("INVALID_STATE", `Tenant ${tenantSlug} not found`);
  }
  const tenantId = tenantResult.rows[0].id;
  if (shop) {
    await withTenant(tenantSlug, async () => {
      return sql2`
        UPDATE shopify_connections
        SET
          status = 'disconnected',
          access_token_encrypted = NULL,
          webhook_secret_encrypted = NULL,
          storefront_api_token_encrypted = NULL,
          updated_at = NOW()
        WHERE tenant_id = ${tenantId}
        AND shop = ${shop}
      `;
    });
  } else {
    await withTenant(tenantSlug, async () => {
      return sql2`
        UPDATE shopify_connections
        SET
          status = 'disconnected',
          access_token_encrypted = NULL,
          webhook_secret_encrypted = NULL,
          storefront_api_token_encrypted = NULL,
          updated_at = NOW()
        WHERE tenant_id = ${tenantId}
      `;
    });
  }
}

// src/oauth/credentials.ts
import { sql as sql3, withTenant as withTenant2, createTenantCache } from "@cgk-platform/db";
var CREDENTIAL_CACHE_TTL = 60;
async function getShopifyCredentials(tenantId) {
  const cache = createTenantCache(tenantId);
  const cacheKey = "shopify:credentials";
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const tenantResult = await sql3`SELECT slug FROM public.organizations WHERE id = ${tenantId}`;
  if (tenantResult.rows.length === 0) {
    throw new ShopifyError("NOT_CONNECTED", `Tenant ${tenantId} not found`);
  }
  const tenantSlug = tenantResult.rows[0].slug;
  const result = await withTenant2(tenantSlug, async () => {
    return sql3`
      SELECT
        shop,
        access_token_encrypted,
        webhook_secret_encrypted,
        scopes,
        api_version
      FROM shopify_connections
      WHERE tenant_id = ${tenantId}
      AND status = 'active'
      AND access_token_encrypted IS NOT NULL
      LIMIT 1
    `;
  });
  if (result.rows.length === 0) {
    throw new ShopifyError("NOT_CONNECTED", "Shopify not connected for this tenant");
  }
  const row = result.rows[0];
  const credentials = {
    shop: row.shop,
    accessToken: decryptToken(row.access_token_encrypted),
    webhookSecret: row.webhook_secret_encrypted ? decryptToken(row.webhook_secret_encrypted) : null,
    scopes: row.scopes,
    apiVersion: row.api_version
  };
  await cache.set(cacheKey, credentials, { ttl: CREDENTIAL_CACHE_TTL });
  return credentials;
}
async function isShopifyConnected(tenantSlug) {
  const result = await withTenant2(tenantSlug, async () => {
    return sql3`
      SELECT 1
      FROM shopify_connections
      WHERE status = 'active'
      AND access_token_encrypted IS NOT NULL
      LIMIT 1
    `;
  });
  return result.rows.length > 0;
}
async function getShopifyConnection(tenantSlug) {
  const result = await withTenant2(tenantSlug, async () => {
    return sql3`
      SELECT
        id,
        tenant_id,
        shop,
        scopes,
        api_version,
        pixel_id,
        pixel_active,
        storefront_api_version,
        site_url,
        default_country,
        default_language,
        status,
        last_webhook_at,
        last_sync_at,
        installed_at,
        updated_at
      FROM shopify_connections
      WHERE status != 'disconnected'
      LIMIT 1
    `;
  });
  if (result.rows.length === 0) {
    return null;
  }
  const row = result.rows[0];
  return {
    id: row.id,
    tenantId: row.tenant_id,
    shop: row.shop,
    scopes: row.scopes,
    apiVersion: row.api_version,
    pixelId: row.pixel_id,
    pixelActive: row.pixel_active,
    storefrontApiVersion: row.storefront_api_version,
    siteUrl: row.site_url,
    defaultCountry: row.default_country,
    defaultLanguage: row.default_language,
    status: row.status,
    lastWebhookAt: row.last_webhook_at ? new Date(row.last_webhook_at) : null,
    lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : null,
    installedAt: new Date(row.installed_at),
    updatedAt: new Date(row.updated_at)
  };
}
async function checkConnectionHealth(tenantId) {
  const connection = await getShopifyConnection(tenantId);
  if (!connection) {
    return {
      isConnected: false,
      shop: null,
      status: null,
      tokenValid: false,
      lastWebhookAt: null,
      lastSyncAt: null,
      scopesValid: false,
      missingSCopes: []
    };
  }
  let tokenValid = false;
  try {
    const credentials = await getShopifyCredentials(tenantId);
    const response = await fetch(
      `https://${credentials.shop}/admin/api/${credentials.apiVersion}/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": credentials.accessToken
        }
      }
    );
    tokenValid = response.ok;
  } catch {
    tokenValid = false;
  }
  const scopeValidation = validateScopes(connection.scopes);
  return {
    isConnected: connection.status === "active",
    shop: connection.shop,
    status: connection.status,
    tokenValid,
    lastWebhookAt: connection.lastWebhookAt,
    lastSyncAt: connection.lastSyncAt,
    scopesValid: scopeValidation.valid,
    missingSCopes: scopeValidation.missing
  };
}
async function updateLastWebhookAt(tenantId) {
  const tenantResult = await sql3`SELECT slug FROM public.organizations WHERE id = ${tenantId}`;
  if (tenantResult.rows.length === 0) {
    return;
  }
  const tenantSlug = tenantResult.rows[0].slug;
  await withTenant2(tenantSlug, async () => {
    await sql3`
      UPDATE shopify_connections
      SET last_webhook_at = NOW()
      WHERE tenant_id = ${tenantId}
    `;
  });
}
async function updateLastSyncAt(tenantId) {
  const tenantResult = await sql3`SELECT slug FROM public.organizations WHERE id = ${tenantId}`;
  if (tenantResult.rows.length === 0) {
    return;
  }
  const tenantSlug = tenantResult.rows[0].slug;
  await withTenant2(tenantSlug, async () => {
    await sql3`
      UPDATE shopify_connections
      SET last_sync_at = NOW()
      WHERE tenant_id = ${tenantId}
    `;
  });
}
async function clearCredentialsCache(tenantId) {
  const cache = createTenantCache(tenantId);
  await cache.delete("shopify:credentials");
}

// src/oauth/webhooks.ts
import { sql as sql4 } from "@cgk-platform/db";
var WEBHOOK_TOPICS = [
  "orders/create",
  "orders/updated",
  "orders/fulfilled",
  "orders/cancelled",
  "orders/paid",
  "products/create",
  "products/update",
  "products/delete",
  "customers/create",
  "customers/update",
  "customers/delete",
  "refunds/create",
  "fulfillments/create",
  "fulfillments/update",
  "inventory_levels/update",
  "app/uninstalled"
];
var webhookHandlers = /* @__PURE__ */ new Map();
function onWebhook(topic, handler) {
  const handlers = webhookHandlers.get(topic) || [];
  handlers.push(handler);
  webhookHandlers.set(topic, handlers);
}
async function getTenantIdForShop(shop) {
  const result = await sql4`
    SELECT tenant_id
    FROM shopify_connections
    WHERE shop = ${shop}
    AND status = 'active'
    LIMIT 1
  `;
  return result.rows[0]?.tenant_id || null;
}
async function handleWebhook(request) {
  const shop = request.headers.get("x-shopify-shop-domain");
  const topic = request.headers.get("x-shopify-topic");
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  const webhookId = request.headers.get("x-shopify-webhook-id");
  if (!shop || !topic || !hmac) {
    return new Response("Missing required headers", { status: 400 });
  }
  const tenantId = await getTenantIdForShop(shop);
  if (!tenantId) {
    console.warn(`[shopify-webhook] Webhook from unknown shop: ${shop}`);
    return new Response("Shop not found", { status: 404 });
  }
  const body = await request.text();
  let credentials;
  try {
    credentials = await getShopifyCredentials(tenantId);
  } catch (error) {
    if (error instanceof ShopifyError && error.code === "NOT_CONNECTED") {
      return new Response("Shop not connected", { status: 404 });
    }
    throw error;
  }
  const secret = credentials.webhookSecret || process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) {
    console.error("[shopify-webhook] No webhook secret available");
    return new Response("Configuration error", { status: 500 });
  }
  if (!verifyWebhookHmac(body, hmac, secret)) {
    console.error(`[shopify-webhook] Invalid signature for shop: ${shop}`);
    return new Response("Invalid signature", { status: 401 });
  }
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  await updateLastWebhookAt(tenantId);
  const handlers = webhookHandlers.get(topic) || [];
  console.log(`[shopify-webhook] Processing ${topic} for tenant ${tenantId} (${webhookId})`);
  const handlerPromises = handlers.map(async (handler) => {
    try {
      await handler(tenantId, payload);
    } catch (error) {
      console.error(
        `[shopify-webhook] Handler error for ${topic}:`,
        error instanceof Error ? error.message : error
      );
    }
  });
  await Promise.all(handlerPromises);
  return new Response("OK", { status: 200 });
}
async function registerWebhooks(tenantId, shop, baseUrl) {
  const credentials = await getShopifyCredentials(tenantId);
  const registered = [];
  const errors = [];
  for (const topic of WEBHOOK_TOPICS) {
    try {
      const webhookAddress = `${baseUrl}/api/shopify/webhooks/${topic.replace("/", "-")}`;
      const response = await fetch(
        `https://${shop}/admin/api/${credentials.apiVersion}/webhooks.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": credentials.accessToken
          },
          body: JSON.stringify({
            webhook: {
              topic,
              address: webhookAddress,
              format: "json"
            }
          })
        }
      );
      if (response.ok) {
        registered.push(topic);
      } else {
        const errorData = await response.text();
        errors.push(`${topic}: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      errors.push(
        `${topic}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  return { registered, errors };
}
async function unregisterWebhooks(tenantId) {
  const credentials = await getShopifyCredentials(tenantId);
  const response = await fetch(
    `https://${credentials.shop}/admin/api/${credentials.apiVersion}/webhooks.json`,
    {
      headers: {
        "X-Shopify-Access-Token": credentials.accessToken
      }
    }
  );
  if (!response.ok) {
    throw new ShopifyError(
      "TOKEN_EXCHANGE_FAILED",
      `Failed to list webhooks: ${response.status}`
    );
  }
  const data = await response.json();
  for (const webhook of data.webhooks) {
    await fetch(
      `https://${credentials.shop}/admin/api/${credentials.apiVersion}/webhooks/${webhook.id}.json`,
      {
        method: "DELETE",
        headers: {
          "X-Shopify-Access-Token": credentials.accessToken
        }
      }
    );
  }
}
export {
  DEFAULT_API_VERSION,
  PLATFORM_SCOPES,
  ShopifyError,
  WEBHOOK_TOPICS,
  addCartLines,
  adminGetProduct,
  adminListProducts,
  adminQuery,
  applyCartDiscountCodes,
  checkConnectionHealth,
  clearCredentialsCache,
  createAdminClient,
  createCart,
  createStorefrontClient,
  decryptToken,
  deleteOAuthState,
  disconnectStore,
  encryptToken,
  generateSecureToken,
  getArticleByHandle,
  getBlogArticles,
  getCart,
  getCollectionByHandle,
  getCollectionMetafield,
  getCollectionProducts,
  getCustomer,
  getCustomerOrders,
  getMenu,
  getOAuthState,
  getOrder,
  getOrganizationIdForShop,
  getOrganizationShops,
  getProductByHandle,
  getProductById,
  getProductMetafields,
  getProductRecommendations,
  getScopesString,
  getShop,
  getShopInstallation,
  getShopPolicies,
  getShopifyConnection,
  getShopifyCredentials,
  getTenantIdForShop,
  handleOAuthCallback,
  handleWebhook,
  initAdmin,
  initStorefront,
  initiateOAuth,
  isShopActive,
  isShopifyConnected,
  isValidOAuthTimestamp,
  isValidShopDomain,
  listAllInstallations,
  listCollections,
  listCustomers,
  listOrders,
  listProducts,
  normalizeShopDomain,
  normalizeStoreDomain,
  onWebhook,
  parseWebhook,
  predictiveSearch,
  reactivateShopInstallation,
  recordShopInstallation,
  recordShopUninstallation,
  registerWebhooks,
  removeCartDiscountCodes,
  removeCartLines,
  searchProducts,
  storefrontQuery,
  suspendShopInstallation,
  unregisterWebhooks,
  updateCartAttributes,
  updateCartBuyerIdentity,
  updateCartLines,
  updateLastSyncAt,
  updateLastWebhookAt,
  validateScopes,
  validateShopDomain,
  verifyOAuthHmac,
  verifyWebhook,
  verifyWebhookHmac
};
