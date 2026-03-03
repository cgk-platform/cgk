/**
 * Verify SleepSaver Product via Shopify Storefront API
 *
 * Fetches product directly from Shopify to verify data matches Figma
 */

require('dotenv').config({ path: './apps/storefront/.env.local' })

async function verifyProduct() {
  const storeDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
  const storefrontToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN

  if (!storeDomain || !storefrontToken) {
    console.error('❌ Missing Shopify credentials in .env.local')
    console.log('Required vars: NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN, NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN')
    process.exit(1)
  }

  const handle = 'sleepersaver-sofa-support-board-permanently-installed-sleeper-sofa-support-board-for-sofa-bed'

  const query = `
    query getProduct($handle: String!) {
      product(handle: $handle) {
        id
        title
        handle
        description
        vendor
        productType
        availableForSale
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 20) {
          edges {
            node {
              url
              altText
              width
              height
            }
          }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              sku
              price {
                amount
                currencyCode
              }
              compareAtPrice {
                amount
                currencyCode
              }
              availableForSale
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
  `

  try {
    console.log('🔍 Fetching product from Shopify Storefront API...')
    console.log('Store:', storeDomain)
    console.log('Handle:', handle)
    console.log('')

    const response = await fetch(`https://${storeDomain}/api/2026-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontToken,
      },
      body: JSON.stringify({
        query,
        variables: { handle },
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.errors) {
      console.error('❌ GraphQL errors:', JSON.stringify(data.errors, null, 2))
      process.exit(1)
    }

    const product = data.data.product

    if (!product) {
      console.error('❌ Product not found with handle:', handle)
      process.exit(1)
    }

    console.log('✅ Product found!\n')
    console.log('📦 Product Details:')
    console.log('─────────────────────────────────────')
    console.log('ID:', product.id)
    console.log('Title:', product.title)
    console.log('Handle:', product.handle)
    console.log('Vendor:', product.vendor)
    console.log('Product Type:', product.productType)
    console.log('Available:', product.availableForSale)
    console.log(
      'Price Range:',
      `$${product.priceRange.minVariantPrice.amount} - $${product.priceRange.maxVariantPrice.amount}`
    )
    console.log('\n')

    // Expected Figma pricing
    const expectedPricing = {
      Twin: { compareAt: '131.99', price: '99.74', savings: '32.00' },
      Full: { compareAt: '129.99', price: '109.99', savings: '20.00' },
      Queen: { compareAt: '143.99', price: '129.99', savings: '40.00' }, // Figma shows "SAVE $40"
    }

    console.log('🎯 Product Variants:')
    console.log('─────────────────────────────────────')
    console.log(`Found ${product.variants.edges.length} variants\n`)

    product.variants.edges.forEach((edge, index) => {
      const variant = edge.node
      const sizeName = variant.title.split(' ')[0] // "Twin", "Full", or "Queen"
      const expected = expectedPricing[sizeName]

      console.log(`Variant ${index + 1}: ${variant.title}`)
      console.log('  ID:', variant.id)
      console.log('  SKU:', variant.sku || 'N/A')
      console.log('  Price:', `$${variant.price.amount} ${variant.price.currencyCode}`)

      if (variant.compareAtPrice) {
        const savings = (
          parseFloat(variant.compareAtPrice.amount) - parseFloat(variant.price.amount)
        ).toFixed(2)
        console.log('  Compare At:', `$${variant.compareAtPrice.amount}`)
        console.log('  Savings:', `$${savings}`)
      } else {
        console.log('  Compare At: N/A')
      }

      console.log('  Available:', variant.availableForSale)
      console.log('  Options:', variant.selectedOptions.map((o) => `${o.name}: ${o.value}`).join(', '))

      // Check Figma match
      if (expected) {
        const priceMatch = variant.price.amount === expected.price
        const compareMatch = variant.compareAtPrice
          ? variant.compareAtPrice.amount === expected.compareAt
          : false

        if (priceMatch && compareMatch) {
          console.log('  ✅ Matches Figma pricing')
        } else {
          console.log('  ⚠️  Pricing differs from Figma:')
          if (!priceMatch)
            console.log(`     Expected price: $${expected.price}, Got: $${variant.price.amount}`)
          if (!compareMatch && variant.compareAtPrice)
            console.log(
              `     Expected compare: $${expected.compareAt}, Got: $${variant.compareAtPrice.amount}`
            )
        }
      }

      console.log('')
    })

    console.log('🖼️  Product Images:')
    console.log('─────────────────────────────────────')
    console.log(`Found ${product.images.edges.length} images (Figma design shows 9)`)
    console.log(product.images.edges.length >= 9 ? '✅ Sufficient images\n' : '⚠️  May need more images\n')

    product.images.edges.slice(0, 3).forEach((edge, index) => {
      const img = edge.node
      console.log(`Image ${index + 1}: ${img.url.substring(0, 70)}...`)
      console.log(`  Size: ${img.width}x${img.height}`)
      console.log(`  Alt: ${img.altText || 'N/A'}`)
      console.log('')
    })

    if (product.images.edges.length > 3) {
      console.log(`... and ${product.images.edges.length - 3} more images\n`)
    }

    // Extract numeric ID from GID
    const numericId = product.id.split('/').pop()

    console.log('📝 Verification Summary:')
    console.log('─────────────────────────────────────')
    console.log('Product ID:', numericId, numericId === '8898756804843' ? '✅' : '⚠️')
    console.log('Has 3 variants?', product.variants.edges.length === 3 ? '✅' : '⚠️')
    console.log('Has 9+ images?', product.images.edges.length >= 9 ? '✅' : '⚠️')
    console.log('Product available?', product.availableForSale ? '✅' : '⚠️')
    console.log(
      'All variants available?',
      product.variants.edges.every((e) => e.node.availableForSale) ? '✅' : '⚠️'
    )
    console.log('\n✅ Verification complete!')
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

verifyProduct()
