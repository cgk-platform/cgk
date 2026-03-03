const fetch = require('node-fetch')

;(async () => {
  try {
    // Test local storefront API
    const url = 'http://localhost:3300/api/products?first=8'

    console.log(`🧪 Testing: ${url}\n`)

    const response = await fetch(url, {
      headers: {
        'Host': 'localhost:3300',
      },
    })

    const data = await response.json()

    console.log('📊 Response Status:', response.status)
    console.log('📦 Response Data:', JSON.stringify(data, null, 2))

    if (data.success) {
      console.log('\n✅ API call successful!')
      console.log(`📦 Found ${data.data.length} products`)
      console.log(`🎨 Source: ${data.mock ? 'MOCK DATA' : 'SHOPIFY'}`)

      if (data.data.length > 0) {
        console.log('\n🖼️  Product Images:')
        data.data.forEach((product, i) => {
          console.log(`${i + 1}. ${product.title}`)
          console.log(`   Image: ${product.featuredImage?.url || 'NO IMAGE'}`)
        })
      }
    } else {
      console.log('\n❌ API call failed')
      console.log('Error:', data.error)
    }

  } catch (error) {
    console.error('❌ Error testing API:', error.message)
    console.error('\n💡 Is the dev server running? Try: cd apps/meliusly-storefront && pnpm dev')
  }
})()
