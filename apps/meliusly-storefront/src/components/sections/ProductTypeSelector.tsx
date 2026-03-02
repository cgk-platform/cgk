'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface ProductCategory {
  id: string
  label: string
  href: string
  description?: string
}

const categories: ProductCategory[] = [
  {
    id: 'all',
    label: 'All Products',
    href: '/collections/all',
    description: 'Browse our complete range of furniture support solutions',
  },
  {
    id: 'sofa-bed',
    label: 'Sofa Bed Supports',
    href: '/collections/sofa-bed-supports',
    description: 'Transform your sleeper sofa into a comfortable bed',
  },
  {
    id: 'mattress',
    label: 'Mattress Supports',
    href: '/collections/mattress-supports',
    description: 'Reinforce and extend the life of your mattress',
  },
  {
    id: 'custom',
    label: 'Custom Solutions',
    href: '/collections/custom-solutions',
    description: 'Tailored support systems for unique furniture needs',
  },
  {
    id: 'accessories',
    label: 'Accessories',
    href: '/collections/accessories',
    description: 'Enhance and maintain your furniture supports',
  },
]

export function ProductTypeSelector() {
  const [activeTab, setActiveTab] = useState('all')
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 })
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  useEffect(() => {
    const activeElement = tabRefs.current[activeTab]
    if (activeElement) {
      setUnderlineStyle({
        left: activeElement.offsetLeft,
        width: activeElement.offsetWidth,
      })
    }
  }, [activeTab])

  const activeCategory = categories.find((cat) => cat.id === activeTab)

  return (
    <section className="relative w-full bg-gradient-to-b from-white via-gray-50/30 to-white py-20 md:py-28">
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative container mx-auto px-4 md:px-6">
        {/* Section Heading */}
        <motion.div
          className="mb-12 text-center md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="font-manrope text-meliusly-dark mb-3 text-3xl leading-tight font-semibold tracking-tight md:text-[40px]">
            Find your Support Solution
          </h2>
          <p className="font-manrope mx-auto max-w-2xl text-base text-gray-600 md:text-lg">
            Explore our range of premium furniture support systems designed for lasting comfort
          </p>
        </motion.div>

        {/* Tab Selector */}
        <div className="mb-16">
          <div className="relative mx-auto max-w-5xl">
            {/* Tab Container */}
            <div className="relative flex flex-wrap justify-center gap-2 pb-1 md:gap-1">
              {categories.map((category, index) => (
                <motion.button
                  key={category.id}
                  ref={(el) => {
                    tabRefs.current[category.id] = el
                  }}
                  onClick={() => setActiveTab(category.id)}
                  className={`font-manrope relative px-5 py-3.5 text-sm font-semibold transition-all duration-300 ease-out md:px-7 md:py-4 md:text-base ${
                    activeTab === category.id
                      ? 'text-meliusly-primary'
                      : 'text-meliusly-dark hover:text-meliusly-primary/80'
                  } `}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.05,
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {category.label}

                  {/* Hover background effect */}
                  <motion.div
                    className="bg-meliusly-primary/5 absolute inset-0 -z-10 rounded-lg"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.button>
              ))}

              {/* Animated underline */}
              <motion.div
                className="from-meliusly-primary via-meliusly-primary to-meliusly-primary/70 absolute bottom-0 h-[3px] rounded-full bg-gradient-to-r"
                animate={{
                  left: underlineStyle.left,
                  width: underlineStyle.width,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 380,
                  damping: 38,
                  mass: 0.8,
                }}
              />
            </div>
          </div>

          {/* Active Category Description */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className="mt-8 text-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="font-manrope mx-auto max-w-xl text-base text-gray-600">
                {activeCategory?.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Product Grid Placeholder - This would connect to actual product data */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {[1, 2, 3].map((item, index) => (
            <motion.div
              key={`${activeTab}-${item}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: index * 0.1,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {/* Product card content would go here */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-100" />

              {/* Overlay on hover */}
              <div className="from-meliusly-dark/80 via-meliusly-dark/20 absolute inset-0 bg-gradient-to-t to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              {/* Action button */}
              <div className="absolute right-0 bottom-0 left-0 translate-y-4 p-6 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                <Link
                  href={activeCategory?.href || '/collections/all'}
                  className="bg-meliusly-primary font-manrope hover:bg-meliusly-primary/90 inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors"
                >
                  Shop Now
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View All Link */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Link
            href={activeCategory?.href || '/collections/all'}
            className="font-manrope text-meliusly-primary hover:text-meliusly-primary/80 group inline-flex items-center gap-2 text-base font-semibold transition-colors"
          >
            View All {activeCategory?.label}
            <svg
              className="h-5 w-5 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
