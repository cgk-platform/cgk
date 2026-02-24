/**
 * Shopify GraphQL query modules
 */

export {
  listProducts,
  getProductByHandle,
  getProductById,
  adminListProducts,
  adminGetProduct,
  type ListProductsParams,
} from './products'

export {
  listOrders,
  getOrder,
  type ListOrdersParams,
} from './orders'

export {
  listCustomers,
  getCustomer,
  getCustomerOrders,
  type ListCustomersParams,
} from './customers'

export {
  createCart,
  getCart,
  addCartLines,
  updateCartLines,
  removeCartLines,
  updateCartAttributes,
  applyCartDiscountCodes,
  removeCartDiscountCodes,
  updateCartBuyerIdentity,
  type ShopifyCart,
  type ShopifyCartDiscountCode,
  type ShopifyCartDiscountAllocation,
  type CartLineInput,
  type CartBuyerIdentityInput,
} from './cart'

export {
  listCollections,
  getCollectionByHandle,
  getCollectionProducts,
  type ListCollectionsParams,
  type CollectionProductsParams,
  type ProductFilter,
  type ShopifyProductFilter,
} from './collections'

export {
  predictiveSearch,
  searchProducts,
  type PredictiveSearchParams,
  type SearchParams,
  type SearchFilter,
  type ShopifySearchFilter,
} from './search'

export {
  getShop,
  getMenu,
  getShopPolicies,
  type ShopInfo,
  type ShopPolicy,
  type ShopPolicies,
  type ShopifyMenu,
  type ShopifyMenuItem,
} from './shop'

export {
  getProductMetafields,
  getCollectionMetafield,
  type ShopifyMetafield,
  type MetafieldIdentifier,
} from './metafields'
