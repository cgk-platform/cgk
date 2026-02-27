/**
 * Meliusly Figma Audit Skill
 *
 * Provides comprehensive Figma-to-code workflow for Meliusly storefront.
 * Encapsulates all Figma knowledge (node IDs, design tokens, sections) and
 * enables pixel-perfect validation of implementation.
 *
 * Commands:
 * - extract <section> [page=homepage] - Get Figma screenshot + design context
 * - list [page=homepage] - List all sections with node IDs
 * - tokens - Get design tokens (colors, typography, breakpoints)
 * - audit <page> - Generate audit checklist for a page
 *
 * Usage:
 *   /meliusly-figma-audit extract hero
 *   /meliusly-figma-audit list pdp
 *   /meliusly-figma-audit tokens
 */

export default {
  name: 'meliusly-figma-audit',
  description: 'Figma audit and extraction for Meliusly storefront - ensures pixel-perfect implementation',

  // Hardcoded Figma knowledge base
  config: {
    figmaFileUrl: 'https://www.figma.com/design/P14Fv87DK7Bj5Zf162DA61/Meliusly?node-id=0-1',

    // All Figma sections organized by page
    sections: {
      homepage: {
        header: {
          nodeId: '1:4243',
          height: 700,
          name: 'Header',
          description: 'Main header with navigation, logo, cart icon'
        },
        trustBar: {
          nodeId: '1:4244',
          height: 121,
          name: 'Trust Bar',
          description: 'Trust badges for durability, protection, sizing'
        },
        productType: {
          nodeId: '1:4245',
          height: 623,
          name: 'Product Type',
          description: 'Product category selector (SleepSaver, Classic, Flex)'
        },
        products: {
          nodeId: '1:4246',
          height: 878,
          name: 'Products',
          description: 'Best sellers product grid'
        },
        shipping: {
          nodeId: '1:4247',
          height: 82,
          name: 'Shipping',
          description: 'Shipping info banner (free shipping threshold)'
        },
        why: {
          nodeId: '1:4248',
          height: 525,
          name: 'Why Meliusly',
          description: 'USP/value propositions section'
        },
        reviews: {
          nodeId: '1:4249',
          height: 877,
          name: 'Reviews',
          description: 'Customer testimonials carousel'
        },
        about: {
          nodeId: '1:4250',
          height: 743,
          name: 'About',
          description: 'Brand story section'
        },
        guides: {
          nodeId: '1:4251',
          height: 423,
          name: 'Product Guides',
          description: 'Educational content links'
        },
        org: {
          nodeId: '1:4252',
          height: 358,
          name: 'Org',
          description: 'Organizational/company info'
        },
        traits: {
          nodeId: '1:4253',
          height: 104,
          name: 'Traits',
          description: 'Product traits/features bar'
        },
        footer: {
          nodeId: '1:4254',
          height: 396,
          heightMobile: 1149,
          name: 'Footer',
          description: 'Site footer with navigation and newsletter'
        },
      },

      pdp: {
        header: {
          nodeId: '1:4128',
          height: 1455,
          name: 'PDP Header',
          description: 'Product gallery, title, price, add to cart'
        },
        benefits: {
          nodeId: '1:4129',
          height: 741,
          name: 'Benefits',
          description: 'Product benefits grid'
        },
        features: {
          nodeId: '1:4130',
          height: 722,
          name: 'Features',
          description: 'Product features section'
        },
        reviews: {
          nodeId: '1:4131',
          height: 895,
          name: 'Reviews',
          description: 'Product reviews section'
        },
        dimensions: {
          nodeId: '1:4132',
          height: 554,
          name: 'Dimensions',
          description: 'Product dimensions/measurements'
        },
        install: {
          nodeId: '1:4133',
          height: 545,
          name: 'How to Install',
          description: 'Installation instructions'
        },
        video: {
          nodeId: '1:4134',
          height: 943,
          name: 'Video',
          description: 'Product demo video'
        },
        press: {
          nodeId: '1:4135',
          height: 245,
          name: 'Press',
          description: 'Press mentions and logos'
        },
        faq: {
          nodeId: '1:4136',
          height: 610,
          name: 'FAQ',
          description: 'Frequently asked questions accordion'
        },
        comparison: {
          nodeId: '1:4137',
          height: 1066,
          name: 'Comparison',
          description: 'Product comparison table'
        },
        customerReviews: {
          nodeId: '1:4138',
          height: 1832,
          name: 'Customer Reviews',
          description: 'Extended customer reviews with photos'
        },
        traits: {
          nodeId: '1:4139',
          height: 104,
          name: 'Traits',
          description: 'Product traits bar (reused from homepage)'
        },
      },

      collections: {
        nav: {
          nodeId: '1:4175',
          height: 108,
          name: 'Nav',
          description: 'Collection page navigation'
        },
        band: {
          nodeId: '1:4176',
          name: 'Band',
          description: 'Collection hero/header band'
        },
        filters: {
          nodeId: '1:4178',
          name: 'Filters',
          description: 'Filter and sort controls'
        },
        list: {
          nodeId: '1:4182',
          name: 'Product List',
          description: 'Product grid listing'
        },
      },

      cart: {
        drawer: {
          nodeId: '1:4292',
          height: 800,
          width: 360,
          name: 'Cart Drawer',
          description: 'Cart drawer with items (mobile)'
        },
        empty: {
          nodeId: '1:4290',
          height: 800,
          width: 360,
          name: 'Cart Empty State',
          description: 'Empty cart state'
        },
      },

      howItWorks: {
        desktop: {
          nodeId: '1:4301',
          name: 'How It Works Desktop',
          description: 'How It Works page desktop layout'
        },
        mobile: {
          nodeId: '1:4363',
          name: 'How It Works Mobile',
          description: 'How It Works page mobile layout'
        },
      },
    },

    // Design tokens extracted from Figma
    designTokens: {
      colors: {
        primary: '#0268A0',
        primaryRgb: 'rgb(2, 104, 160)',
        dark: '#161F2B',
        darkRgb: 'rgb(22, 31, 43)',
        white: '#FFFFFF',
      },
      typography: {
        fontFamily: 'Manrope',
        fontFamilyFull: 'Manrope, system-ui, sans-serif',
        sizes: {
          xs: { px: 12, lineHeight: '16px' },
          sm: { px: 13, lineHeight: '18px' },
          base: { px: 14, lineHeight: '20px' },
          md: { px: 16, lineHeight: '24px' },
          lg: { px: 18, lineHeight: '28px' },
          xl: { px: 24, lineHeight: '32px' },
          '2xl': { px: 32, lineHeight: '40px' },
          '3xl': { px: 40, lineHeight: '48px' },
        },
        weights: {
          normal: 400,
          medium: 500,
          semibold: 600,
        },
      },
      breakpoints: {
        mobile: 360,
        tablet: 768,
        desktop: 1024,
        wide: 1440,
      },
      spacing: {
        tolerance: '±2px',
        note: 'All spacing measurements should match Figma within ±2px tolerance',
      },
    },
  },

  async run({ args, say }) {
    const [command, ...rest] = args.split(' ')

    switch (command) {
      case 'extract':
        return await this.extract(rest, say)

      case 'list':
        return await this.list(rest, say)

      case 'tokens':
        return this.tokens(say)

      case 'audit':
        return this.audit(rest, say)

      default:
        say(`Unknown command: ${command}`)
        say('')
        say('Available commands:')
        say('  extract <section> [page=homepage] - Get Figma screenshot + design context')
        say('  list [page=homepage] - List all sections with node IDs')
        say('  tokens - Get design tokens (colors, typography, breakpoints)')
        say('  audit <page> - Generate audit checklist for a page')
        say('')
        say('Examples:')
        say('  /meliusly-figma-audit extract hero')
        say('  /meliusly-figma-audit extract benefits pdp')
        say('  /meliusly-figma-audit list')
        say('  /meliusly-figma-audit tokens')
        return { success: false }
    }
  },

  async extract(args, say) {
    const [sectionName, pageName = 'homepage'] = args

    if (!sectionName) {
      say('❌ Please specify a section name')
      say('Usage: /meliusly-figma-audit extract <section> [page=homepage]')
      return { success: false }
    }

    const page = this.config.sections[pageName]
    if (!page) {
      say(`❌ Unknown page: ${pageName}`)
      say(`Available pages: ${Object.keys(this.config.sections).join(', ')}`)
      return { success: false }
    }

    const section = page[sectionName]
    if (!section) {
      say(`❌ Unknown section: ${sectionName} on page ${pageName}`)
      say(`Available sections: ${Object.keys(page).join(', ')}`)
      return { success: false }
    }

    say(`\n📐 **Extracting Figma Data: ${section.name}**\n`)
    say(`**Page:** ${pageName}`)
    say(`**Section:** ${sectionName}`)
    say(`**Node ID:** ${section.nodeId}`)
    say(`**Description:** ${section.description}`)
    if (section.height) say(`**Height:** ${section.height}px${section.heightMobile ? ` (mobile: ${section.heightMobile}px)` : ''}`)
    say('')

    say('To get the Figma screenshot and design context, use:')
    say('```typescript')
    say(`// Get screenshot`)
    say(`mcp__figma-desktop__get_screenshot({`)
    say(`  nodeId: "${section.nodeId}",`)
    say(`  clientLanguages: "typescript,javascript",`)
    say(`  clientFrameworks: "react,next.js"`)
    say(`})`)
    say('')
    say(`// Get design context (measurements, colors, etc.)`)
    say(`mcp__figma-desktop__get_design_context({`)
    say(`  nodeId: "${section.nodeId}",`)
    say(`  artifactType: "COMPONENT_WITHIN_A_WEB_PAGE_OR_APP_SCREEN",`)
    say(`  clientLanguages: "typescript,javascript",`)
    say(`  clientFrameworks: "react,next.js"`)
    say(`})`)
    say('```')
    say('')

    say('**Pixel-Perfect Validation Checklist:**')
    say('- [ ] Typography: Font family (Manrope), sizes, weights, line-heights')
    say('- [ ] Colors: Exact hex matches (#0268A0, #161F2B)')
    say('- [ ] Spacing: Margins, padding, gaps (±2px tolerance)')
    say('- [ ] Layout: Grid columns, alignment, responsive breakpoints')
    say('- [ ] Images: Position, size, aspect ratio')
    say('- [ ] Borders, shadows, border radius')

    return {
      success: true,
      section: section.name,
      nodeId: section.nodeId,
      page: pageName,
    }
  },

  async list(args, say) {
    const [pageName = 'homepage'] = args

    const page = this.config.sections[pageName]
    if (!page) {
      say(`❌ Unknown page: ${pageName}`)
      say(`Available pages: ${Object.keys(this.config.sections).join(', ')}`)
      return { success: false }
    }

    say(`\n📋 **${pageName.toUpperCase()} Sections**\n`)

    const sections = Object.entries(page)
    sections.forEach(([key, data], index) => {
      say(`${index + 1}. **${data.name}** (${key})`)
      say(`   - Node ID: ${data.nodeId}`)
      say(`   - Description: ${data.description}`)
      if (data.height) {
        say(`   - Height: ${data.height}px${data.heightMobile ? ` (mobile: ${data.heightMobile}px)` : ''}`)
      }
      say('')
    })

    say(`Total sections: ${sections.length}`)

    return {
      success: true,
      page: pageName,
      count: sections.length,
      sections: Object.keys(page),
    }
  },

  tokens(say) {
    const { colors, typography, breakpoints, spacing } = this.config.designTokens

    say('\n🎨 **Meliusly Design Tokens**\n')

    say('**Colors:**')
    say(`- Primary: ${colors.primary} (${colors.primaryRgb})`)
    say(`- Dark: ${colors.dark} (${colors.darkRgb})`)
    say(`- White: ${colors.white}`)
    say('')

    say('**Typography:**')
    say(`- Font Family: ${typography.fontFamily}`)
    say(`- Full Stack: ${typography.fontFamilyFull}`)
    say('')
    say('Font Sizes:')
    Object.entries(typography.sizes).forEach(([name, { px, lineHeight }]) => {
      say(`  - ${name}: ${px}px (line-height: ${lineHeight})`)
    })
    say('')
    say('Font Weights:')
    Object.entries(typography.weights).forEach(([name, weight]) => {
      say(`  - ${name}: ${weight}`)
    })
    say('')

    say('**Breakpoints:**')
    Object.entries(breakpoints).forEach(([name, px]) => {
      say(`- ${name}: ${px}px`)
    })
    say('')

    say('**Spacing:**')
    say(`- Tolerance: ${spacing.tolerance}`)
    say(`- Note: ${spacing.note}`)

    return {
      success: true,
      tokens: this.config.designTokens,
    }
  },

  audit(args, say) {
    const [pageName = 'homepage'] = args

    const page = this.config.sections[pageName]
    if (!page) {
      say(`❌ Unknown page: ${pageName}`)
      say(`Available pages: ${Object.keys(this.config.sections).join(', ')}`)
      return { success: false }
    }

    say(`\n✅ **${pageName.toUpperCase()} Audit Checklist**\n`)
    say('Use this checklist to verify pixel-perfect implementation of each section.\n')

    const sections = Object.entries(page)
    sections.forEach(([key, data], index) => {
      say(`### ${index + 1}. ${data.name} (${key})`)
      say(`- [ ] Extract Figma screenshot (node: ${data.nodeId})`)
      say(`- [ ] Build component with exact measurements`)
      say(`- [ ] Screenshot live component at 1440px and 360px`)
      say(`- [ ] Typography matches (Manrope, sizes, weights, line-heights)`)
      say(`- [ ] Colors match exactly (#0268A0, #161F2B)`)
      say(`- [ ] Spacing within ±2px tolerance`)
      say(`- [ ] Visual parity >95% (verified by /reviewer agent)`)
      say(`- [ ] Responsive behavior matches Figma mobile/desktop variants`)
      say(`- [ ] Lighthouse performance check passed`)
      say('')
    })

    say('**Final Validation:**')
    say('- [ ] All sections implemented')
    say('- [ ] Overall visual parity >98%')
    say('- [ ] No discrepancies remaining')
    say('- [ ] /reviewer agent approval obtained')

    return {
      success: true,
      page: pageName,
      sectionCount: sections.length,
    }
  },
}
