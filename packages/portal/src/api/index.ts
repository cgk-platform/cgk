/**
 * Customer Portal API
 *
 * API functions for querying customer data from Shopify Customer Account API.
 */

export { customerQuery, customerMutation, getShopifyConfig } from './client'

export { getCustomer, updateCustomer } from './customer'

export { getOrders, getOrder } from './orders'

export {
  getSubscriptions,
  getSubscription,
  pauseSubscription,
  resumeSubscription,
  skipNextDelivery,
  cancelSubscription,
} from './subscriptions'

export {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from './addresses'

export {
  getStoreCreditAccounts,
  getTotalStoreCreditBalance,
  getStoreCreditTransactions,
} from './store-credit'
