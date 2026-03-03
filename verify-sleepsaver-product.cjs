/**
 * Verify SleepSaver Product Data
 *
 * Fetches the SleepSaver product from Shopify to verify:
 * - Product exists and matches expected handle
 * - Product ID matches 8898756804843
 * - Three variants exist (Twin, Full, Queen)
 * - Pricing matches Figma design
 * - Product has required images
 */

require('dotenv').config({ path: './apps/storefront/.env.local' })

const { createClient } = require('@vercel/postgres')

async function verifyProduct() {
  const client = createClient()
  await client.connect()

  try {
    console.log('🔍 Fetching SleepSaver product from database...\n')

    const handle = 'sleepersaver-sofa-support-board-permanently-installed-sleeper-sofa-support-board-for-sofa-bed'

    // Query product from database
    const result = await client.sql`
      SELECT
        id,
        shopify_product_id,
        handle,
        title,
        description,
        product_type,
        vendor,
        available_for_sale,
        price_range_min,
        price_range_max,
        created_at
      FROM products
      WHERE handle = ${handle}
      LIMIT 1
    `

    if (result.rows.length === 0) {
      console.error('❌ Product not found in database with handle:', handle)
      console.log('\nTrying to fetch from Shopify API instead...\n')
      process.exit(1)
    }

    const product = result.rows[0]

    console.log('✅ Product found in database!')
    console.log('\n📦 Product Details:')
    console.log('─────────────────────────────────────')
    console.log('Title:', product.title)
    console.log('Handle:', product.handle)
    console.log('Shopify Product ID:', product.shopify_product_id)
    console.log('Product Type:', product.product_type)
    console.log('Vendor:', product.vendor)
    console.log('Available:', product.available_for_sale)
    console.log('Price Range:', `$${product.price_range_min} - $${product.price_range_max}`)
    console.log('\n')

    // Fetch variants
    const variantsResult = await client.sql`
      SELECT
        id,
        shopify_variant_id,
        title,
        sku,
        price,
        compare_at_price,
        available_for_sale,
        options
      FROM product_variants
      WHERE product_id = ${product.id}
      ORDER BY position ASC
    `

    console.log('🎯 Product Variants:')
    console.log('─────────────────────────────────────')
    console.log(`Found ${variantsResult.rows.length} variants\n`)

    // Expected pricing from Figma
    const expectedPricing = {
      'Twin': { compareAt: 131.99, price: 99.74, savings: 32.25 },
      'Full': { compareAt: 129.99, price: 109.99, savings: 20.00 },
      'Queen': { compareAt: 143.99, price: 129.99, savings: 14.00 }, // Note: Figma says save $40 but math is $14
    }

    variantsResult.rows.forEach((variant, index) => {
      console.log(`Variant ${index + 1}:`)
      console.log('  Title:', variant.title)
      console.log('  SKU:', variant.sku)
      console.log('  Price:', `$${variant.price}`)
      console.log('  Compare At:', variant.compare_at_price ? `$${variant.compare_at_price}` : 'N/A')

      if (variant.compare_at_price) {
        const savings = (parseFloat(variant.compare_at_price) - parseFloat(variant.price)).toFixed(2)
        console.log('  Savings:', `$${savings}`)
      }

      console.log('  Available:', variant.available_for_sale)
      console.log('  Options:', JSON.stringify(variant.options, null, 2))

      // Check if pricing matches Figma
      const sizeName = variant.title.split(' ')[0] // Extract "Twin", "Full", or "Queen"
      const expected = expectedPricing[sizeName]

      if (expected) {
        const priceMatch = Math.abs(parseFloat(variant.price) - expected.price) < 0.01
        const compareMatch = variant.compare_at_price
          ? Math.abs(parseFloat(variant.compare_at_price) - expected.compareAt) < 0.01
          : false

        console.log('  Figma Match:', priceMatch && compareMatch ? '✅' : '⚠️  Pricing differs from Figma')
      }

      console.log('')
    })

    // Fetch images
    const imagesResult = await client.sql`
      SELECT
        id,
        url,
        alt_text,
        width,
        height,
        position
      FROM product_images
      WHERE product_id = ${product.id}
      ORDER BY position ASC
    `

    console.log('🖼️  Product Images:')
    console.log('─────────────────────────────────────')
    console.log(`Found ${imagesResult.rows.length} images (Figma design shows 9)`)
    console.log(imagesResult.rows.length >= 9 ? '✅ Sufficient images' : '⚠️  May need more images\n')

    imagesResult.rows.slice(0, 3).forEach((img, index) => {
      console.log(`Image ${index + 1}: ${img.url.substring(0, 60)}...`)
    })

    if (imagesResult.rows.length > 3) {
      console.log(`... and ${imagesResult.rows.length - 3} more`)
    }

    console.log('\n✅ Verification complete!')
    console.log('\n📝 Summary:')
    console.log('─────────────────────────────────────')
    console.log('Product ID matches?', product.shopify_product_id === '8898756804843' ? '✅' : '⚠️')
    console.log('Has 3 variants?', variantsResult.rows.length === 3 ? '✅' : '⚠️')
    console.log('Has images?', imagesResult.rows.length > 0 ? '✅' : '❌')
    console.log('Product available?', product.available_for_sale ? '✅' : '⚠️')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

verifyProduct()
