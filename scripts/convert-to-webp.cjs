#!/usr/bin/env node

const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const BASE_DIR = path.join(__dirname, '../apps/meliusly-storefront/public')

// Directories to convert
const DIRECTORIES = [
  'assets',
  'meliusly/guides',
  'meliusly/pdp',
  'meliusly/logo',
  'meliusly'
]

// Skip directories that already have webp
const SKIP_DIRECTORIES = ['meliusly/hero']

let totalOriginalSize = 0
let totalConvertedSize = 0
let filesConverted = 0
const conversionLog = []

async function convertToWebP(inputPath, outputPath) {
  try {
    const originalStats = fs.statSync(inputPath)
    totalOriginalSize += originalStats.size

    await sharp(inputPath)
      .webp({ quality: 85 })
      .toFile(outputPath)

    const convertedStats = fs.statSync(outputPath)
    totalConvertedSize += convertedStats.size

    const savings = ((1 - convertedStats.size / originalStats.size) * 100).toFixed(2)

    conversionLog.push({
      file: path.relative(BASE_DIR, inputPath),
      originalSize: (originalStats.size / 1024).toFixed(2) + ' KB',
      convertedSize: (convertedStats.size / 1024).toFixed(2) + ' KB',
      savings: savings + '%'
    })

    filesConverted++
    console.log(`✓ Converted: ${path.basename(inputPath)} (saved ${savings}%)`)
  } catch (error) {
    console.error(`✗ Error converting ${inputPath}:`, error.message)
  }
}

async function findAndConvertImages(dir) {
  const fullPath = path.join(BASE_DIR, dir)

  if (!fs.existsSync(fullPath)) {
    console.log(`⊘ Directory not found: ${dir}`)
    return
  }

  const files = fs.readdirSync(fullPath)

  for (const file of files) {
    const filePath = path.join(fullPath, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      continue
    }

    const ext = path.extname(file).toLowerCase()
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      const outputPath = filePath.replace(/\.(png|jpg|jpeg)$/i, '.webp')

      // Skip if webp already exists
      if (fs.existsSync(outputPath)) {
        console.log(`⊘ Skipping ${file} (webp already exists)`)
        continue
      }

      await convertToWebP(filePath, outputPath)
    }
  }
}

async function main() {
  console.log('🖼️  Starting PNG/JPG to WebP conversion...\n')

  for (const dir of DIRECTORIES) {
    if (SKIP_DIRECTORIES.includes(dir)) {
      console.log(`⊘ Skipping directory: ${dir}\n`)
      continue
    }

    console.log(`📁 Processing: ${dir}`)
    await findAndConvertImages(dir)
    console.log('')
  }

  // Print summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 CONVERSION SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Files converted: ${filesConverted}`)
  console.log(`Total original size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Total converted size: ${(totalConvertedSize / 1024 / 1024).toFixed(2)} MB`)

  const totalSavings = ((1 - totalConvertedSize / totalOriginalSize) * 100).toFixed(2)
  console.log(`Total savings: ${totalSavings}%`)
  console.log(`Space saved: ${((totalOriginalSize - totalConvertedSize) / 1024 / 1024).toFixed(2)} MB`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Write detailed log
  const logPath = path.join(BASE_DIR, '../../IMAGE-OPTIMIZATION.md')
  const logContent = `# Image Optimization Report

Generated: ${new Date().toISOString()}

## Summary

- **Files converted:** ${filesConverted}
- **Total original size:** ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB
- **Total converted size:** ${(totalConvertedSize / 1024 / 1024).toFixed(2)} MB
- **Total savings:** ${totalSavings}%
- **Space saved:** ${((totalOriginalSize - totalConvertedSize) / 1024 / 1024).toFixed(2)} MB

## Conversion Details

| File | Original Size | Converted Size | Savings |
|------|--------------|----------------|---------|
${conversionLog.map(log => `| ${log.file} | ${log.originalSize} | ${log.convertedSize} | ${log.savings} |`).join('\n')}

## Next Steps

1. Update image references in components:
   - src/components/sections/SecondBand.tsx
   - src/components/sections/ReviewsCarousel.tsx
   - src/components/sections/CollectionsComparison.tsx
   - Any other components using PNG files

2. Test all pages to ensure images load correctly

3. Once verified, consider removing original PNG files to save space

## Quality Settings

- Format: WebP
- Quality: 85%
- Library: sharp v${require('sharp/package.json').version}
`

  fs.writeFileSync(logPath, logContent)
  console.log(`📄 Detailed report saved to: ${path.relative(process.cwd(), logPath)}`)
}

main().catch(console.error)
