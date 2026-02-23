export interface BundleItem {
  productId: string
  variantId: string
  title: string
  price: number // cents
  image?: string
  position: number
}

export interface BundleTier {
  count: number
  discount: number // percentage or cents depending on discount_type
  label: string
}

export interface Bundle {
  id: string
  name: string
  headline: string | null
  description: string | null
  status: 'draft' | 'active' | 'archived'
  items: BundleItem[]
  discountType: 'percentage' | 'fixed'
  tiers: BundleTier[]
  minItems: number
  maxItems: number
  layout: 'grid' | 'list'
  columnsDesktop: number
  imageRatio: 'square' | 'portrait' | 'landscape'
  ctaText: string
  showSavings: boolean
  showTierProgress: boolean
  enableQuantity: boolean
  bgColor: string | null
  textColor: string | null
  accentColor: string | null
  shopifySectionId: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateBundleInput {
  name: string
  headline?: string
  description?: string
  items?: BundleItem[]
  discount_type?: 'percentage' | 'fixed'
  tiers?: BundleTier[]
  min_items?: number
  max_items?: number
  layout?: 'grid' | 'list'
  columns_desktop?: number
  image_ratio?: 'square' | 'portrait' | 'landscape'
  cta_text?: string
  show_savings?: boolean
  show_tier_progress?: boolean
  enable_quantity?: boolean
  bg_color?: string
  text_color?: string
  accent_color?: string
}

export interface UpdateBundleInput extends Partial<CreateBundleInput> {
  status?: 'draft' | 'active' | 'archived'
}

export interface BundleOrderStats {
  totalOrders: number
  totalRevenue: number
  totalDiscount: number
  avgOrderSize: number
}
