import * as _shopify_hydrogen_react from '@shopify/hydrogen-react';
export { StorefrontClientProps as HydrogenStorefrontClientProps } from '@shopify/hydrogen-react';

interface HydrogenClientConfig {
    tenantId: string;
    shopDomain: string;
}
/**
 * Creates Shopify Storefront client with dual token source:
 * 1. Primary: Database (multi-tenant, encrypted)
 * 2. Fallback: NEXT_PUBLIC env var (debugging)
 */
declare function createHydrogenClient(config: HydrogenClientConfig): Promise<{
    query: <T = unknown>(graphqlQuery: string, variables?: Record<string, unknown>) => Promise<{
        data: T;
        errors?: unknown[];
    }>;
    _metadata: {
        tenantId: string;
        shopDomain: string;
        tokenSource: "database" | "env-fallback";
    };
    getShopifyDomain: (props?: Partial<Pick<_shopify_hydrogen_react.StorefrontClientProps, "storeDomain">>) => string;
    getStorefrontApiUrl: (props?: Partial<Pick<_shopify_hydrogen_react.StorefrontClientProps, "storeDomain" | "storefrontApiVersion">>) => string;
    getPrivateTokenHeaders: (props?: Partial<Pick<_shopify_hydrogen_react.StorefrontClientProps, "contentType">> & Pick<_shopify_hydrogen_react.StorefrontClientProps, "privateStorefrontToken"> & {
        buyerIp?: string;
    }) => Record<string, string>;
    getPublicTokenHeaders: (props?: Partial<Pick<_shopify_hydrogen_react.StorefrontClientProps, "contentType">> & Pick<_shopify_hydrogen_react.StorefrontClientProps, "publicStorefrontToken">) => Record<string, string>;
}>;

/**
 * Shopify configuration types
 */
interface ShopifyConfig {
    storeDomain: string;
    storefrontAccessToken?: string;
    adminAccessToken?: string;
    apiVersion?: string;
}
interface StorefrontConfig {
    storeDomain: string;
    storefrontAccessToken: string;
    apiVersion?: string;
}
interface AdminConfig {
    storeDomain: string;
    adminAccessToken: string;
    apiVersion?: string;
}
declare const DEFAULT_API_VERSION = "2026-01";
declare function normalizeStoreDomain(domain: string): string;

/**
 * Shopify Storefront API client
 */

interface StorefrontClient {
    readonly storeDomain: string;
    readonly apiVersion: string;
    query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T>;
}
/**
 * Create a Storefront API client
 */
declare function createStorefrontClient(config: StorefrontConfig): StorefrontClient;

/**
 * Shopify Admin API client
 */

interface AdminClient {
    readonly storeDomain: string;
    readonly apiVersion: string;
    query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T>;
}
/**
 * Create an Admin API client
 */
declare function createAdminClient(config: AdminConfig): AdminClient;

/**
 * GraphQL query helpers
 */

/**
 * Execute a Storefront API query
 * Requires prior initialization with initStorefront()
 */
declare function storefrontQuery<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T>;
/**
 * Execute an Admin API query
 * Requires prior initialization with initAdmin()
 */
declare function adminQuery<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T>;
/**
 * Initialize the Storefront client for use with storefrontQuery()
 */
declare function initStorefront(config: StorefrontConfig): StorefrontClient;
/**
 * Initialize the Admin client for use with adminQuery()
 */
declare function initAdmin(config: AdminConfig): AdminClient;

/**
 * Shopify common types
 */
interface ShopifyProduct {
    id: string;
    title: string;
    handle: string;
    description: string;
    descriptionHtml: string;
    vendor: string;
    productType: string;
    tags: string[];
    variants: ShopifyVariantConnection;
    images: ShopifyImageConnection;
    priceRange: ShopifyPriceRange;
    availableForSale: boolean;
    createdAt: string;
    updatedAt: string;
    seo?: {
        title: string | null;
        description: string | null;
    };
}
interface ShopifyVariant {
    id: string;
    title: string;
    sku: string | null;
    price: ShopifyMoney;
    compareAtPrice: ShopifyMoney | null;
    availableForSale: boolean;
    selectedOptions: ShopifySelectedOption[];
    image: ShopifyImage | null;
}
interface ShopifyVariantConnection {
    edges: Array<{
        node: ShopifyVariant;
    }>;
}
interface ShopifyImage {
    id: string;
    url: string;
    altText: string | null;
    width: number;
    height: number;
}
interface ShopifyImageConnection {
    edges: Array<{
        node: ShopifyImage;
    }>;
}
interface ShopifyPriceRange {
    minVariantPrice: ShopifyMoney;
    maxVariantPrice: ShopifyMoney;
}
interface ShopifyMoney {
    amount: string;
    currencyCode: string;
}
interface ShopifySelectedOption {
    name: string;
    value: string;
}
interface ShopifyOrder {
    id: string;
    name: string;
    orderNumber: number;
    email: string | null;
    totalPrice: ShopifyMoney;
    subtotalPrice: ShopifyMoney;
    totalTax: ShopifyMoney | null;
    totalShippingPrice: ShopifyMoney | null;
    lineItems: ShopifyLineItemConnection;
    shippingAddress: ShopifyAddress | null;
    billingAddress: ShopifyAddress | null;
    fulfillmentStatus: string;
    financialStatus: string;
    createdAt: string;
    updatedAt: string;
}
interface ShopifyLineItem {
    id: string;
    title: string;
    quantity: number;
    variant: ShopifyVariant | null;
    originalUnitPrice: ShopifyMoney;
    discountedTotalPrice: ShopifyMoney;
}
interface ShopifyLineItemConnection {
    edges: Array<{
        node: ShopifyLineItem;
    }>;
}
interface ShopifyAddress {
    firstName: string | null;
    lastName: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    province: string | null;
    provinceCode: string | null;
    country: string | null;
    countryCode: string | null;
    zip: string | null;
    phone: string | null;
}
interface ShopifyCustomer {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    defaultAddress: ShopifyAddress | null;
    addresses: ShopifyAddressConnection;
    orders: ShopifyOrderConnection;
    createdAt: string;
    updatedAt: string;
}
interface ShopifyAddressConnection {
    edges: Array<{
        node: ShopifyAddress;
    }>;
}
interface ShopifyOrderConnection {
    edges: Array<{
        node: ShopifyOrder;
    }>;
}
interface ShopifyCollection {
    id: string;
    title: string;
    handle: string;
    description: string;
    descriptionHtml: string;
    image: ShopifyImage | null;
    products: ShopifyProductConnection;
}
interface ShopifyProductConnection {
    edges: Array<{
        node: ShopifyProduct;
    }>;
    pageInfo: ShopifyPageInfo;
}
interface ShopifyPageInfo {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
}

/**
 * Shopify Product GraphQL queries
 */

interface ListProductsParams {
    first?: number;
    after?: string;
    query?: string;
    sortKey?: 'TITLE' | 'PRICE' | 'CREATED_AT' | 'UPDATED_AT' | 'BEST_SELLING';
    reverse?: boolean;
}
declare function listProducts(client: StorefrontClient, params?: ListProductsParams): Promise<{
    products: ShopifyProduct[];
    pageInfo: ShopifyPageInfo;
}>;
declare function getProductByHandle(client: StorefrontClient, handle: string): Promise<ShopifyProduct | null>;
declare function getProductById(client: StorefrontClient, id: string): Promise<ShopifyProduct | null>;
declare function adminListProducts(client: AdminClient, params?: ListProductsParams): Promise<{
    products: ShopifyProduct[];
    pageInfo: ShopifyPageInfo;
}>;
declare function adminGetProduct(client: AdminClient, id: string): Promise<ShopifyProduct | null>;
/**
 * Get product recommendations from Shopify.
 *
 * Uses Shopify's built-in recommendation engine to suggest related products
 * based on purchase history, product descriptions, and collections.
 *
 * @param client - Storefront API client
 * @param productId - The Shopify product GID (e.g. "gid://shopify/Product/123")
 * @returns Array of recommended products
 */
declare function getProductRecommendations(client: StorefrontClient, productId: string): Promise<ShopifyProduct[]>;

/**
 * Shopify Order GraphQL queries (Admin API)
 */

interface ListOrdersParams {
    first?: number;
    after?: string;
    query?: string;
    sortKey?: 'CREATED_AT' | 'UPDATED_AT' | 'TOTAL_PRICE' | 'ORDER_NUMBER';
    reverse?: boolean;
}
declare function listOrders(client: AdminClient, params?: ListOrdersParams): Promise<{
    orders: ShopifyOrder[];
    pageInfo: ShopifyPageInfo;
}>;
declare function getOrder(client: AdminClient, id: string): Promise<ShopifyOrder | null>;

/**
 * Shopify Customer GraphQL queries (Admin API)
 */

interface ListCustomersParams {
    first?: number;
    after?: string;
    query?: string;
    sortKey?: 'CREATED_AT' | 'UPDATED_AT' | 'NAME';
    reverse?: boolean;
}
declare function listCustomers(client: AdminClient, params?: ListCustomersParams): Promise<{
    customers: ShopifyCustomer[];
    pageInfo: ShopifyPageInfo;
}>;
declare function getCustomer(client: AdminClient, id: string): Promise<ShopifyCustomer | null>;
declare function getCustomerOrders(client: AdminClient, customerId: string, params?: {
    first?: number;
    after?: string;
}): Promise<{
    orders: ShopifyOrder[];
    pageInfo: ShopifyPageInfo;
}>;

/**
 * Shopify Cart queries (Storefront API)
 */

interface ShopifyCartDiscountCode {
    code: string;
    applicable: boolean;
}
interface ShopifyCartDiscountAllocation {
    discountedAmount: {
        amount: string;
        currencyCode: string;
    };
}
interface ShopifyCartUserError {
    code: string | null;
    field: string[];
    message: string;
}
interface ShopifyCart {
    id: string;
    checkoutUrl: string;
    totalQuantity: number;
    createdAt: string;
    updatedAt: string;
    attributes: Array<{
        key: string;
        value: string;
    }>;
    discountCodes: ShopifyCartDiscountCode[];
    discountAllocations: ShopifyCartDiscountAllocation[];
    cost: {
        subtotalAmount: {
            amount: string;
            currencyCode: string;
        };
        totalAmount: {
            amount: string;
            currencyCode: string;
        };
    };
    lines: {
        edges: Array<{
            node: {
                id: string;
                quantity: number;
                merchandise: {
                    id: string;
                    title: string;
                    product: {
                        id: string;
                        title: string;
                        handle: string;
                    };
                    price: {
                        amount: string;
                        currencyCode: string;
                    };
                    image: {
                        url: string;
                        altText: string | null;
                    } | null;
                    selectedOptions: Array<{
                        name: string;
                        value: string;
                    }>;
                };
                cost: {
                    amountPerQuantity: {
                        amount: string;
                        currencyCode: string;
                    };
                    totalAmount: {
                        amount: string;
                        currencyCode: string;
                    };
                    compareAtAmountPerQuantity: {
                        amount: string;
                        currencyCode: string;
                    } | null;
                };
                discountAllocations: ShopifyCartDiscountAllocation[];
            };
        }>;
    };
}
interface CartBuyerIdentityInput {
    email?: string;
    countryCode?: string;
    phone?: string;
}
declare function createCart(client: StorefrontClient): Promise<ShopifyCart>;
declare function getCart(client: StorefrontClient, cartId: string): Promise<ShopifyCart | null>;
interface CartLineInput {
    merchandiseId: string;
    quantity: number;
    attributes?: Array<{
        key: string;
        value: string;
    }>;
}
declare function addCartLines(client: StorefrontClient, cartId: string, lines: CartLineInput[]): Promise<ShopifyCart>;
declare function updateCartLines(client: StorefrontClient, cartId: string, lines: Array<{
    id: string;
    quantity: number;
}>): Promise<ShopifyCart>;
declare function removeCartLines(client: StorefrontClient, cartId: string, lineIds: string[]): Promise<ShopifyCart>;
/**
 * Update cart attributes
 */
declare function updateCartAttributes(client: StorefrontClient, cartId: string, attributes: Array<{
    key: string;
    value: string;
}>): Promise<ShopifyCart>;
/**
 * Apply discount codes to cart
 */
declare function applyCartDiscountCodes(client: StorefrontClient, cartId: string, discountCodes: string[]): Promise<ShopifyCart>;
/**
 * Remove discount codes from cart (pass empty array)
 */
declare function removeCartDiscountCodes(client: StorefrontClient, cartId: string): Promise<ShopifyCart>;
/**
 * Associate buyer identity with cart (e.g. after customer login)
 */
declare function updateCartBuyerIdentity(client: StorefrontClient, cartId: string, buyerIdentity: CartBuyerIdentityInput): Promise<ShopifyCart>;

/**
 * Shopify Collection GraphQL queries
 */

interface ListCollectionsParams {
    first?: number;
    after?: string;
    query?: string;
    sortKey?: 'TITLE' | 'UPDATED_AT' | 'ID';
    reverse?: boolean;
}
interface CollectionProductsParams {
    first?: number;
    after?: string;
    filters?: ProductFilter[];
    sortKey?: 'TITLE' | 'PRICE' | 'CREATED' | 'BEST_SELLING' | 'MANUAL' | 'COLLECTION_DEFAULT';
    reverse?: boolean;
}
interface ProductFilter {
    variantOption?: {
        name: string;
        value: string;
    };
    price?: {
        min?: number;
        max?: number;
    };
    available?: boolean;
    productType?: string;
    tag?: string;
}
interface ShopifyProductFilter {
    id: string;
    label: string;
    type: string;
    values: Array<{
        id: string;
        label: string;
        count: number;
        input: string;
    }>;
}
declare function listCollections(client: StorefrontClient, params?: ListCollectionsParams): Promise<{
    collections: ShopifyCollection[];
    pageInfo: ShopifyPageInfo;
}>;
declare function getCollectionByHandle(client: StorefrontClient, handle: string): Promise<ShopifyCollection | null>;
declare function getCollectionProducts(client: StorefrontClient, handle: string, params?: CollectionProductsParams): Promise<{
    products: ShopifyProduct[];
    pageInfo: ShopifyPageInfo;
    filters: ShopifyProductFilter[];
} | null>;

/**
 * Shopify Search GraphQL queries
 */

interface PredictiveSearchParams {
    query: string;
    types?: Array<'PRODUCT' | 'COLLECTION' | 'QUERY'>;
    limit?: number;
}
interface SearchParams {
    query: string;
    first?: number;
    after?: string;
    sortKey?: 'RELEVANCE' | 'PRICE';
    reverse?: boolean;
    productFilters?: SearchFilter[];
}
interface SearchFilter {
    variantOption?: {
        name: string;
        value: string;
    };
    price?: {
        min?: number;
        max?: number;
    };
    available?: boolean;
    productType?: string;
}
interface ShopifySearchFilter {
    id: string;
    label: string;
    type: string;
    values: Array<{
        id: string;
        label: string;
        count: number;
        input: string;
    }>;
}
declare function predictiveSearch(client: StorefrontClient, params: PredictiveSearchParams): Promise<{
    products: ShopifyProduct[];
    collections: ShopifyCollection[];
    queries: Array<{
        text: string;
        styledText: string;
    }>;
}>;
declare function searchProducts(client: StorefrontClient, params: SearchParams): Promise<{
    products: ShopifyProduct[];
    pageInfo: ShopifyPageInfo;
    totalCount: number;
    filters: ShopifySearchFilter[];
}>;

/**
 * Shopify Shop & Navigation GraphQL queries
 */

interface ShopInfo {
    name: string;
    description: string;
    primaryDomain: {
        url: string;
        host: string;
    };
    paymentSettings: {
        currencyCode: string;
        acceptedCardBrands: string[];
        enabledPresentmentCurrencies: string[];
    };
    brand: {
        logo: {
            image: {
                url: string;
                altText: string | null;
                width: number;
                height: number;
            };
        } | null;
        slogan: string | null;
        shortDescription: string | null;
        colors: {
            primary: Array<{
                background: string;
                foreground: string;
            }>;
            secondary: Array<{
                background: string;
                foreground: string;
            }>;
        };
    } | null;
}
interface ShopifyMenu {
    id: string;
    handle: string;
    title: string;
    items: ShopifyMenuItem[];
}
interface ShopifyMenuItem {
    id: string;
    title: string;
    url: string;
    type: string;
    resourceId: string | null;
    items: ShopifyMenuItem[];
}
declare function getShop(client: StorefrontClient): Promise<ShopInfo>;
interface ShopPolicy {
    title: string;
    body: string;
    handle: string;
}
interface ShopPolicies {
    privacyPolicy: ShopPolicy | null;
    termsOfService: ShopPolicy | null;
    shippingPolicy: ShopPolicy | null;
    refundPolicy: ShopPolicy | null;
}
/**
 * Fetch shop legal policies (privacy, terms, shipping, refund)
 */
declare function getShopPolicies(client: StorefrontClient): Promise<ShopPolicies>;
declare function getMenu(client: StorefrontClient, handle: string): Promise<ShopifyMenu | null>;

/**
 * Shopify Metafield GraphQL queries
 */

interface ShopifyMetafield {
    namespace: string;
    key: string;
    value: string;
    type: string;
}
interface MetafieldIdentifier {
    namespace: string;
    key: string;
}
declare function getProductMetafields(client: StorefrontClient, handle: string, identifiers: MetafieldIdentifier[]): Promise<ShopifyMetafield[]>;
declare function getCollectionMetafield(client: StorefrontClient, handle: string, namespace: string, key: string): Promise<ShopifyMetafield | null>;

/**
 * Shopify Blog & Article GraphQL queries
 */

interface ShopifyBlog {
    id: string;
    handle: string;
    title: string;
    articles: {
        edges: Array<{
            node: ShopifyArticle;
        }>;
        pageInfo: {
            hasNextPage: boolean;
            endCursor: string | null;
        };
    };
}
interface ShopifyArticle {
    id: string;
    handle: string;
    title: string;
    excerpt: string | null;
    excerptHtml: string | null;
    contentHtml: string;
    publishedAt: string;
    image: {
        url: string;
        altText: string | null;
        width: number;
        height: number;
    } | null;
    authorV2: {
        name: string;
        bio: string | null;
    } | null;
    blog: {
        handle: string;
        title: string;
    };
    tags: string[];
    seo: {
        title: string | null;
        description: string | null;
    } | null;
}
/**
 * Fetch a blog and its articles by handle.
 * Defaults to 'news' blog handle if not specified.
 */
declare function getBlogArticles(client: StorefrontClient, blogHandle?: string, first?: number, after?: string): Promise<ShopifyBlog | null>;
/**
 * Fetch a single article by blog handle and article handle.
 */
declare function getArticleByHandle(client: StorefrontClient, blogHandle: string, articleHandle: string): Promise<ShopifyArticle | null>;

/**
 * Shopify webhook utilities
 */
type WebhookTopic = 'orders/create' | 'orders/updated' | 'orders/fulfilled' | 'orders/cancelled' | 'products/create' | 'products/update' | 'products/delete' | 'customers/create' | 'customers/update' | 'customers/delete' | 'app/uninstalled' | string;
interface WebhookPayload {
    topic: WebhookTopic;
    shop: string;
    body: unknown;
}
/**
 * Verify a Shopify webhook signature
 */
declare function verifyWebhook(body: string | Buffer, hmacHeader: string, secret: string): boolean;
/**
 * Parse a webhook request
 */
declare function parseWebhook(body: string, topic: string, shop: string): WebhookPayload;

/**
 * Shopify OAuth error types
 */
type ShopifyErrorCode = 'INVALID_SHOP' | 'INVALID_HMAC' | 'INVALID_STATE' | 'SHOP_MISMATCH' | 'NOT_CONNECTED' | 'TOKEN_EXCHANGE_FAILED' | 'ENCRYPTION_FAILED' | 'DECRYPTION_FAILED' | 'MISSING_CONFIG';
declare class ShopifyError extends Error {
    readonly code: ShopifyErrorCode;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: ShopifyErrorCode, message: string, details?: Record<string, unknown> | undefined);
    toJSON(): {
        name: string;
        code: ShopifyErrorCode;
        message: string;
        details: Record<string, unknown> | undefined;
    };
}

/**
 * Token encryption/decryption for Shopify OAuth tokens
 *
 * Uses AES-256-GCM for authenticated encryption.
 * Tokens are stored as: iv:authTag:cipherText (all hex-encoded)
 */
/**
 * Encrypt a token using AES-256-GCM
 *
 * @param token - Plaintext token to encrypt
 * @returns Encrypted string in format: iv:authTag:cipherText
 */
declare function encryptToken(token: string): string;
/**
 * Decrypt a token encrypted with AES-256-GCM
 *
 * @param encrypted - Encrypted string in format: iv:authTag:cipherText
 * @returns Decrypted plaintext token
 */
declare function decryptToken(encrypted: string): string;
/**
 * Generate a secure random token
 *
 * @param bytes - Number of random bytes
 * @returns Hex-encoded random token
 */
declare function generateSecureToken(bytes?: number): string;

/**
 * Shopify OAuth scopes for the CGK platform
 *
 * The platform requests all scopes upfront to support current
 * and future functionality without requiring re-authentication.
 */
/**
 * All platform scopes combined
 */
declare const PLATFORM_SCOPES: readonly ["read_orders", "write_orders", "read_draft_orders", "write_draft_orders", "read_checkouts", "write_checkouts", "read_customers", "write_customers", "read_customer_payment_methods", "read_products", "write_products", "read_inventory", "write_inventory", "read_product_listings", "read_publications", "read_product_feeds", "write_product_feeds", "read_fulfillments", "write_fulfillments", "read_shipping", "write_shipping", "read_locations", "read_merchant_managed_fulfillment_orders", "write_merchant_managed_fulfillment_orders", "read_third_party_fulfillment_orders", "write_third_party_fulfillment_orders", "read_assigned_fulfillment_orders", "write_assigned_fulfillment_orders", "read_discounts", "write_discounts", "read_price_rules", "write_price_rules", "read_marketing_events", "write_marketing_events", "read_gift_cards", "write_gift_cards", "read_content", "write_content", "read_themes", "write_themes", "read_locales", "write_pixels", "read_customer_events", "read_analytics", "read_reports", "read_markets", "write_markets", "read_own_subscription_contracts", "write_own_subscription_contracts", "read_customer_merge", "read_files", "write_files", "read_shop", "read_legal_policies"];
type PlatformScope = (typeof PLATFORM_SCOPES)[number];
/**
 * Get scopes as a comma-separated string for OAuth URL
 */
declare function getScopesString(): string;
/**
 * Validate that granted scopes include required scopes
 */
declare function validateScopes(grantedScopes: string[]): {
    valid: boolean;
    missing: string[];
};

/**
 * Shopify OAuth types
 */
/**
 * OAuth initiation parameters
 */
interface OAuthInitiateParams {
    tenantId: string;
    shop: string;
    redirectUri: string;
}
/**
 * OAuth callback parameters from Shopify
 */
interface OAuthCallbackParams {
    shop: string;
    code: string;
    state: string;
    hmac: string;
    timestamp: string;
    host?: string;
}
/**
 * OAuth token response from Shopify
 */
interface OAuthTokenResponse {
    access_token: string;
    scope: string;
}
/**
 * Shopify connection status
 */
type ConnectionStatus = 'active' | 'suspended' | 'disconnected';
/**
 * Shopify connection record from database
 */
interface ShopifyConnection {
    id: string;
    tenantId: string;
    shop: string;
    scopes: string[];
    apiVersion: string;
    pixelId: string | null;
    pixelActive: boolean;
    storefrontApiVersion: string;
    siteUrl: string | null;
    defaultCountry: string;
    defaultLanguage: string;
    status: ConnectionStatus;
    lastWebhookAt: Date | null;
    lastSyncAt: Date | null;
    installedAt: Date;
    updatedAt: Date;
}
/**
 * Decrypted Shopify credentials
 */
interface ShopifyCredentials {
    shop: string;
    accessToken: string;
    webhookSecret: string | null;
    scopes: string[];
    apiVersion: string;
}
/**
 * OAuth state record from database
 */
interface OAuthStateRecord {
    id: string;
    tenantId: string;
    shop: string;
    state: string;
    nonce: string;
    redirectUri: string;
    expiresAt: Date;
    createdAt: Date;
}
/**
 * Webhook registration configuration
 */
interface WebhookRegistration {
    topic: string;
    address: string;
    format?: 'json' | 'xml';
}
/**
 * Connection health check result
 */
interface ConnectionHealthCheck {
    isConnected: boolean;
    shop: string | null;
    status: ConnectionStatus | null;
    tokenValid: boolean;
    lastWebhookAt: Date | null;
    lastSyncAt: Date | null;
    scopesValid: boolean;
    missingSCopes: string[];
}

/**
 * Shopify OAuth validation utilities
 */
/**
 * Validate a Shopify shop domain
 */
declare function isValidShopDomain(shop: string): boolean;
/**
 * Validate shop domain and throw if invalid
 */
declare function validateShopDomain(shop: string): void;
/**
 * Normalize a shop domain to standard format
 */
declare function normalizeShopDomain(shop: string): string;
/**
 * Verify HMAC signature for OAuth callback
 *
 * @param params - OAuth callback parameters (excluding hmac)
 * @param hmac - HMAC signature from Shopify
 * @param clientSecret - Shopify app client secret
 */
declare function verifyOAuthHmac(params: Record<string, string>, hmac: string, clientSecret: string): boolean;
/**
 * Verify webhook HMAC signature
 *
 * @param body - Raw request body
 * @param hmac - HMAC signature from X-Shopify-Hmac-Sha256 header
 * @param secret - Webhook signing secret
 */
declare function verifyWebhookHmac(body: string | Buffer, hmac: string, secret: string): boolean;
/**
 * Validate OAuth timestamp is recent (within 5 minutes)
 */
declare function isValidOAuthTimestamp(timestamp: string): boolean;

/**
 * Shopify OAuth initiation
 */

/**
 * Initiate Shopify OAuth flow
 *
 * Creates an OAuth state record and returns the authorization URL.
 *
 * @param params - OAuth initiation parameters
 * @returns Authorization URL to redirect the user to
 *
 * @example
 * ```ts
 * const authUrl = await initiateOAuth({
 *   tenantId: 'uuid-here',
 *   shop: 'my-store.myshopify.com',
 *   redirectUri: 'https://admin.example.com/api/shopify/oauth/callback',
 * })
 *
 * // Redirect user to authUrl
 * ```
 */
declare function initiateOAuth(params: OAuthInitiateParams): Promise<string>;
/**
 * Get the OAuth state record for verification
 *
 * @param state - OAuth state token
 * @returns OAuth state record or null if not found/expired
 */
declare function getOAuthState(state: string): Promise<{
    tenantId: string;
    shop: string;
    nonce: string;
    redirectUri: string;
} | null>;
/**
 * Delete OAuth state after use
 *
 * @param state - OAuth state token to delete
 */
declare function deleteOAuthState(state: string): Promise<void>;

/**
 * Shopify OAuth callback handling
 */

/**
 * Handle Shopify OAuth callback
 *
 * Verifies the callback, exchanges the code for an access token,
 * encrypts and stores the credentials, and registers webhooks.
 *
 * @param params - OAuth callback parameters from Shopify
 * @returns Tenant ID and shop domain
 *
 * @example
 * ```ts
 * const { tenantId, shop } = await handleOAuthCallback({
 *   shop: 'my-store.myshopify.com',
 *   code: 'abc123',
 *   state: 'def456',
 *   hmac: 'xyz789',
 *   timestamp: '1234567890',
 * })
 * ```
 */
declare function handleOAuthCallback(params: OAuthCallbackParams): Promise<{
    tenantId: string;
    shop: string;
}>;
/**
 * Disconnect a Shopify store connection
 *
 * Marks the connection as disconnected and clears credentials.
 *
 * @param tenantSlug - Tenant slug (e.g., 'meliusly')
 * @param shop - Shop domain (optional, disconnects all if not provided)
 */
declare function disconnectStore(tenantSlug: string, shop?: string): Promise<void>;

/**
 * Shopify credential management
 *
 * Handles retrieval and caching of decrypted Shopify credentials.
 */

/**
 * Get Shopify credentials by tenant slug
 *
 * Convenience wrapper that converts tenant slug to UUID before fetching credentials.
 *
 * @param tenantSlug - Tenant slug
 * @returns Decrypted Shopify credentials
 * @throws ShopifyError if tenant not found or not connected
 *
 * @example
 * ```ts
 * const credentials = await getShopifyCredentialsBySlug('meliusly')
 * const client = createAdminClient({
 *   storeDomain: credentials.shop,
 *   adminAccessToken: credentials.accessToken,
 * })
 * ```
 */
declare function getShopifyCredentialsBySlug(tenantSlug: string): Promise<ShopifyCredentials>;
/**
 * Get Shopify credentials for a tenant
 *
 * Retrieves and decrypts Shopify credentials, with caching
 * to reduce database load.
 *
 * @param tenantId - Tenant ID (UUID)
 * @returns Decrypted Shopify credentials
 * @throws ShopifyError if not connected
 *
 * @example
 * ```ts
 * const credentials = await getShopifyCredentials('5cb87b13-3b13-4400-9542-53c8b8d12cb8')
 * const client = createAdminClient({
 *   storeDomain: credentials.shop,
 *   adminAccessToken: credentials.accessToken,
 * })
 * ```
 */
declare function getShopifyCredentials(tenantId: string): Promise<ShopifyCredentials>;
/**
 * Check if a tenant has an active Shopify connection
 *
 * @param tenantId - Tenant ID
 * @returns True if connected
 */
declare function isShopifyConnected(tenantSlug: string): Promise<boolean>;
/**
 * Get Shopify connection details for a tenant
 *
 * @param tenantId - Tenant ID
 * @returns Connection details or null if not connected
 */
declare function getShopifyConnection(tenantSlug: string): Promise<ShopifyConnection | null>;
/**
 * Check connection health
 *
 * Verifies the connection is active and token is valid.
 *
 * @param tenantSlug - Tenant slug
 * @returns Connection health check result
 */
declare function checkConnectionHealth(tenantSlug: string): Promise<ConnectionHealthCheck>;
/**
 * Update last webhook timestamp
 *
 * @param tenantId - Tenant ID (UUID)
 */
declare function updateLastWebhookAt(tenantId: string): Promise<void>;
/**
 * Update last sync timestamp
 *
 * @param tenantId - Tenant ID (UUID)
 */
declare function updateLastSyncAt(tenantId: string): Promise<void>;
/**
 * Clear cached credentials
 *
 * Call this when credentials are updated or connection is disconnected.
 *
 * @param tenantId - Tenant ID
 */
declare function clearCredentialsCache(tenantId: string): Promise<void>;

/**
 * Shopify webhook registration and routing
 */
/**
 * Webhook topics to register
 */
declare const WEBHOOK_TOPICS: readonly ["orders/create", "orders/updated", "orders/fulfilled", "orders/cancelled", "orders/paid", "products/create", "products/update", "products/delete", "customers/create", "customers/update", "customers/delete", "refunds/create", "fulfillments/create", "fulfillments/update", "inventory_levels/update", "app/uninstalled"];
/**
 * Webhook handler function type
 */
type WebhookHandler = (tenantId: string, payload: unknown) => Promise<void>;
/**
 * Register a webhook handler
 *
 * @param topic - Webhook topic
 * @param handler - Handler function
 */
declare function onWebhook(topic: string, handler: WebhookHandler): void;
/**
 * Get tenant ID for a shop domain
 *
 * @param shop - Shop domain
 * @returns Tenant ID or null if not found
 */
declare function getTenantIdForShop(shop: string): Promise<string | null>;
/**
 * Handle an incoming webhook
 *
 * Verifies the signature, routes to the correct tenant,
 * and calls registered handlers.
 *
 * @param request - Incoming request
 * @returns Response
 */
declare function handleWebhook(request: Request): Promise<Response>;
/**
 * Register webhooks with Shopify
 *
 * @param tenantId - Tenant ID
 * @param shop - Shop domain
 * @param baseUrl - Base URL for webhook endpoints
 */
declare function registerWebhooks(tenantId: string, shop: string, baseUrl: string): Promise<{
    registered: string[];
    errors: string[];
}>;
/**
 * Unregister all webhooks for a shop
 *
 * @param tenantId - Tenant ID
 */
declare function unregisterWebhooks(tenantId: string): Promise<void>;

/**
 * Shopify App - Tenant Resolution
 *
 * Maps Shopify shop domains to CGK tenant IDs.
 * Used by the embedded Shopify app to identify which tenant
 * the current shop belongs to.
 *
 * This enables TRUE multi-tenancy: one CGK Platform Shopify app
 * can serve ALL tenants (not one app per tenant).
 *
 * Flow:
 * 1. Shop installs CGK Platform app → OAuth flow
 * 2. OAuth callback creates entry in public.shopify_app_installations
 * 3. Webhook arrives → extract shop from headers
 * 4. Call getOrganizationIdForShop(shop) → get tenant ID
 * 5. Query tenant-specific data from tenant schema
 */
interface ShopInstallation {
    id: string;
    shop: string;
    organizationId: string;
    status: 'active' | 'uninstalled' | 'suspended';
    scopes: string[];
    installedAt: Date;
    uninstalledAt: Date | null;
}
interface RecordInstallationParams {
    shop: string;
    organizationId: string;
    scopes: string[];
    shopifyAppId?: string | null;
    primaryContactEmail?: string | null;
}
/**
 * Resolves a Shopify shop domain to a CGK tenant ID.
 *
 * This is the CORE function for multi-tenant routing.
 * Used by:
 * - Webhook handlers (to determine which tenant's data to update)
 * - Remix app routes (to load tenant-specific data)
 * - OAuth callback (to verify shop ownership)
 *
 * @param shop - Shopify shop domain (e.g., "meliusly.myshopify.com")
 * @returns Tenant ID (organization UUID) or null if not found
 *
 * @example
 * const tenantId = await getOrganizationIdForShop('meliusly.myshopify.com')
 * if (!tenantId) {
 *   throw new Error('Shop not registered with a tenant')
 * }
 * await withTenant(tenantId, async () => {
 *   // Query tenant data
 * })
 */
declare function getOrganizationIdForShop(shop: string): Promise<string | null>;
/**
 * Records a shop installation in the public schema.
 *
 * Called during OAuth callback after successful token exchange.
 * Creates or updates the public.shopify_app_installations record
 * to enable tenant resolution.
 *
 * @param params - Installation parameters
 *
 * @example
 * // In OAuth callback after token exchange:
 * await recordShopInstallation({
 *   shop: 'meliusly.myshopify.com',
 *   organizationId: '5cb87b13-3b13-4400-9542-53c8b8d12cb8',
 *   scopes: ['read_products', 'write_products', 'read_orders'],
 *   shopifyAppId: 'app_123',
 * })
 */
declare function recordShopInstallation(params: RecordInstallationParams): Promise<void>;
/**
 * Marks a shop as uninstalled.
 *
 * Called when app/uninstalled webhook is received.
 * Updates status to 'uninstalled' and sets uninstalled_at timestamp.
 *
 * @param shop - Shopify shop domain
 *
 * @example
 * // In app/uninstalled webhook handler:
 * await recordShopUninstallation('meliusly.myshopify.com')
 */
declare function recordShopUninstallation(shop: string): Promise<void>;
/**
 * Reactivates a shop installation (e.g., after reinstall).
 *
 * @param shop - Shopify shop domain
 */
declare function reactivateShopInstallation(shop: string): Promise<void>;
/**
 * Suspends a shop installation (manual platform admin action).
 *
 * @param shop - Shopify shop domain
 */
declare function suspendShopInstallation(shop: string): Promise<void>;
/**
 * Get installation details for a shop.
 *
 * @param shop - Shopify shop domain
 * @returns Installation record or null if not found
 */
declare function getShopInstallation(shop: string): Promise<ShopInstallation | null>;
/**
 * Get all active installations for an organization.
 *
 * @param organizationId - Organization UUID
 * @returns Array of shop domains
 */
declare function getOrganizationShops(organizationId: string): Promise<string[]>;
/**
 * Check if a shop is installed and active.
 *
 * @param shop - Shopify shop domain
 * @returns True if shop is active
 */
declare function isShopActive(shop: string): Promise<boolean>;
/**
 * List all shop installations (for platform admin dashboard).
 *
 * @param filters - Optional filters
 * @returns Array of installations with organization names
 */
declare function listAllInstallations(filters?: {
    status?: 'active' | 'uninstalled' | 'suspended';
    organizationId?: string;
    limit?: number;
    offset?: number;
}): Promise<Array<ShopInstallation & {
    organizationName: string;
    organizationSlug: string;
}>>;

export { type AdminClient, type AdminConfig, type CartBuyerIdentityInput, type CartLineInput, type CollectionProductsParams, type ConnectionHealthCheck, type ConnectionStatus, DEFAULT_API_VERSION, type HydrogenClientConfig, type ListCollectionsParams, type ListCustomersParams, type ListOrdersParams, type ListProductsParams, type MetafieldIdentifier, type OAuthCallbackParams, type OAuthInitiateParams, type OAuthStateRecord, type OAuthTokenResponse, PLATFORM_SCOPES, type PlatformScope, type PredictiveSearchParams, type ProductFilter, type RecordInstallationParams, type SearchFilter, type SearchParams, type ShopInfo, type ShopInstallation, type ShopPolicies, type ShopPolicy, type ShopifyAddress, type ShopifyArticle, type ShopifyBlog, type ShopifyCart, type ShopifyCartDiscountAllocation, type ShopifyCartDiscountCode, type ShopifyCartUserError, type ShopifyCollection, type ShopifyConfig, type ShopifyConnection, type ShopifyCredentials, type ShopifyCustomer, ShopifyError, type ShopifyErrorCode, type ShopifyImage, type ShopifyLineItem, type ShopifyMenu, type ShopifyMenuItem, type ShopifyMetafield, type ShopifyMoney, type ShopifyOrder, type ShopifyPageInfo, type ShopifyProduct, type ShopifyProductConnection, type ShopifyProductFilter, type ShopifySearchFilter, type ShopifyVariant, type StorefrontClient, type StorefrontConfig, WEBHOOK_TOPICS, type WebhookHandler, type WebhookPayload, type WebhookRegistration, type WebhookTopic, addCartLines, adminGetProduct, adminListProducts, adminQuery, applyCartDiscountCodes, checkConnectionHealth, clearCredentialsCache, createAdminClient, createCart, createHydrogenClient, createStorefrontClient, decryptToken, deleteOAuthState, disconnectStore, encryptToken, generateSecureToken, getArticleByHandle, getBlogArticles, getCart, getCollectionByHandle, getCollectionMetafield, getCollectionProducts, getCustomer, getCustomerOrders, getMenu, getOAuthState, getOrder, getOrganizationIdForShop, getOrganizationShops, getProductByHandle, getProductById, getProductMetafields, getProductRecommendations, getScopesString, getShop, getShopInstallation, getShopPolicies, getShopifyConnection, getShopifyCredentials, getShopifyCredentialsBySlug, getTenantIdForShop, handleOAuthCallback, handleWebhook, initAdmin, initStorefront, initiateOAuth, isShopActive, isShopifyConnected, isValidOAuthTimestamp, isValidShopDomain, listAllInstallations, listCollections, listCustomers, listOrders, listProducts, normalizeShopDomain, normalizeStoreDomain, onWebhook, parseWebhook, predictiveSearch, reactivateShopInstallation, recordShopInstallation, recordShopUninstallation, registerWebhooks, removeCartDiscountCodes, removeCartLines, searchProducts, storefrontQuery, suspendShopInstallation, unregisterWebhooks, updateCartAttributes, updateCartBuyerIdentity, updateCartLines, updateLastSyncAt, updateLastWebhookAt, validateScopes, validateShopDomain, verifyOAuthHmac, verifyWebhook, verifyWebhookHmac };
