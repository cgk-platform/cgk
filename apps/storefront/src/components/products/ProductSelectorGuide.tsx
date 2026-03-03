/**
 * Product Selector Guide
 *
 * Guide section to help users choose the right product variant.
 * Displays above the main product with icons and descriptions.
 */

'use client'

import { Package, Wrench, HelpCircle } from 'lucide-react'

interface GuideOption {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  link?: string
}

export function ProductSelectorGuide() {
  const guideOptions: GuideOption[] = [
    {
      icon: Package,
      title: 'Sleeper/Saver Sofa Bed Support Board',
      description:
        'Designed to increase support and comfort for sleeper sofas by reinforcing the mattress pad',
      link: '#',
    },
    {
      icon: Wrench,
      title: 'Custom Sleeper Sofa Support Package',
      description: 'Maximum comfort and support built to meet your exact needs',
      link: '#',
    },
    {
      icon: HelpCircle,
      title: 'Pro Sleeper Sofa Support Board',
      description:
        'For more permanent installations with a level bed surface and dual support boards',
      link: '#',
    },
  ]

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
      <h2 className="mb-4 font-manrope text-xl font-semibold text-meliusly-dark">
        Which Product is Right for Me?
      </h2>
      <p className="mb-6 text-sm text-gray-600">
        If you are unsure which product to choose, please click one of the options below to compare.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {guideOptions.map((option, i) => {
          const Icon = option.icon
          return (
            <a
              key={i}
              href={option.link}
              className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-4 text-center transition-all hover:border-meliusly-primary hover:shadow-md"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-meliusly-primary/10">
                <Icon className="h-6 w-6 text-meliusly-primary" />
              </div>
              <h3 className="mb-2 text-sm font-semibold text-meliusly-dark">{option.title}</h3>
              <p className="text-xs text-gray-600">{option.description}</p>
            </a>
          )
        })}
      </div>
    </div>
  )
}
