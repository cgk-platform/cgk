/**
 * Icon + Text Benefits Bar
 *
 * Horizontal row of benefit items with icons and short text,
 * matching the Liquid section-icon-text.liquid pattern.
 * Displayed between hero banner and product grid.
 */

const BENEFITS = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    heading: 'Secure Checkout',
    subtext: '100% secure payment',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 12h4" />
      </svg>
    ),
    heading: 'Free Shipping',
    subtext: 'On orders over $50',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    heading: '30-Day Returns',
    subtext: 'Hassle-free returns',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    heading: '5-Star Rated',
    subtext: 'Trusted by millions',
  },
]

export function IconTextBar() {
  return (
    <section className="border-y border-gray-200 bg-white py-6">
      <div className="mx-auto max-w-store px-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
          {BENEFITS.map((benefit) => (
            <div key={benefit.heading} className="flex items-center gap-3 justify-center text-center md:text-left">
              <div className="flex-shrink-0 text-cgk-navy">
                {benefit.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-cgk-navy">{benefit.heading}</p>
                <p className="text-xs text-gray-500">{benefit.subtext}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
