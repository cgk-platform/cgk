/**
 * ShopPayInstallment Component
 *
 * Displays Shop Pay installment pricing banner with 4 equal payments at 0% APR.
 * Only shows for products over $50 (Shop Pay minimum).
 */

import type { Money } from '@cgk-platform/commerce'
import { cn } from '@cgk-platform/ui'

interface ShopPayInstallmentProps {
  price: Money
  className?: string
}

export function ShopPayInstallment({ price, className }: ShopPayInstallmentProps) {
  const priceAmount = parseFloat(price.amount)

  // Only show if price is over $50 (Shop Pay minimum)
  if (priceAmount < 50) {
    return null
  }

  // Calculate installment amount (4 equal payments)
  const installmentAmount = priceAmount / 4

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <div
      className={cn(
        'rounded-lg border border-[rgba(34,34,34,0.1)] bg-white px-3.5 py-3 md:px-3.5 md:py-[17px]',
        className
      )}
    >
      <div className="flex items-center gap-1 font-manrope text-[13px] font-medium leading-tight text-meliusly-dark md:text-[15px]">
        <span>From {formatter.format(installmentAmount)}/mo at 0% APR with</span>

        {/* Shop Pay Logo */}
        <svg
          width="42"
          height="13"
          viewBox="0 0 42 13"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mx-0.5"
          aria-label="Shop Pay"
        >
          <rect width="42" height="13" rx="2" fill="#5A31F4" />
          <path
            d="M8.5 4.5c-.83 0-1.5.67-1.5 1.5v1c0 .83.67 1.5 1.5 1.5h1c.83 0 1.5-.67 1.5-1.5V6c0-.83-.67-1.5-1.5-1.5h-1zm-3 1.5c0-1.66 1.34-3 3-3h1c1.66 0 3 1.34 3 3v1c0 1.66-1.34 3-3 3h-1c-1.66 0-3-1.34-3-3V6z"
            fill="white"
          />
          <path
            d="M15.5 4.5c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-.5h-1.5v.5h-1.5v-2h1.5v.5h1.5v-.5c0-.55-.45-1-1-1h-2z"
            fill="white"
          />
          <path
            d="M22.5 4.5c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2c0-.55-.45-1-1-1h-2zm0 1.5h1.5v1.5h-1.5V6z"
            fill="white"
          />
          <path
            d="M28 4.5v4h1.5v-1.5h1c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1H28zm1.5 1.5h1V7h-1V6z"
            fill="white"
          />
          <path
            d="M34.5 4.5c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-.5h-1.5v.5h-1.5v-2h1.5v.5h1.5v-.5c0-.55-.45-1-1-1h-2z"
            fill="white"
          />
        </svg>

        {/* Learn More Link */}
        <a
          href="https://shop.app/what-is-shop-pay"
          target="_blank"
          rel="noopener noreferrer"
          className="text-meliusly-primary hover:underline"
        >
          Learn more
        </a>
      </div>
    </div>
  )
}

export default ShopPayInstallment
