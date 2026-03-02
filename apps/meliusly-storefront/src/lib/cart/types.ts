export interface CartItem {
  variantId: string
  productId: string
  productHandle: string
  productTitle: string
  variantTitle: string
  price: {
    amount: string
    currencyCode: string
  }
  compareAtPrice?: {
    amount: string
    currencyCode: string
  }
  quantity: number
  image?: {
    url: string
    altText: string | null
  }
}

export interface Cart {
  id?: string
  items: CartItem[]
  subtotal: {
    amount: string
    currencyCode: string
  }
  itemCount: number
  createdAt?: Date
  updatedAt?: Date
  shopifyCartId?: string
}

export interface CartContextValue {
  cart: Cart | null
  isLoading: boolean
  error: string | null
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => Promise<void>
  updateQuantity: (variantId: string, quantity: number) => Promise<void>
  removeItem: (variantId: string) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
}
