/**
 * 1099 PDF Generation
 *
 * Generates 1099-NEC PDF forms using pdf-lib.
 * Outputs a PDF buffer that can be stored or sent to recipients.
 *
 * @ai-pattern tax-compliance
 * @ai-note Uses pdf-lib to build a compliant 1099-NEC layout
 */

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib'

// ============================================================================
// TYPES
// ============================================================================

export interface PayerInfo1099 {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  ein: string
  phoneNumber?: string
}

export interface RecipientInfo1099 {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  tin?: string | null
  tinType?: 'ssn' | 'ein' | null
  accountNumber?: string | null
}

export interface Form1099NECData {
  taxYear: number
  payer: PayerInfo1099
  recipient: RecipientInfo1099
  /** Box 1: Nonemployee compensation in cents */
  nonemployeeCompensationCents: number
  /** Box 4: Federal income tax withheld in cents */
  federalTaxWithheldCents?: number
  /** Copy type for labeling */
  copy?: 'A' | 'B' | 'C' | '1' | '2'
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(cents: number): string {
  return (cents / 100).toFixed(2)
}

function drawBox(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  options?: { fill?: ReturnType<typeof rgb>; stroke?: ReturnType<typeof rgb>; thickness?: number }
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: options?.fill,
    borderColor: options?.stroke ?? rgb(0, 0, 0),
    borderWidth: options?.thickness ?? 0.5,
  })
}

function drawLabel(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size = 6,
  color = rgb(0.3, 0.3, 0.3)
) {
  page.drawText(text, { x, y, size, font, color })
}

function drawValue(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size = 9,
  color = rgb(0, 0, 0)
) {
  page.drawText(text, { x, y, size, font, color })
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate a 1099-NEC PDF form
 *
 * @param data - Payer, recipient, and amount information
 * @returns PDF as a Uint8Array buffer
 */
export async function generate1099NECPdf(data: Form1099NECData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Page size: letter (612 x 792 pts), landscape feel per copy
  const page = pdfDoc.addPage([612, 396])
  const { height } = page.getSize()

  const margin = 24
  const formWidth = 612 - margin * 2
  const formY = height - margin

  // ── Title bar ──────────────────────────────────────────────────────────────
  drawBox(page, margin, formY - 24, formWidth, 24, { fill: rgb(0.92, 0.92, 0.92) })
  page.drawText('1099-NEC', {
    x: margin + 8,
    y: formY - 18,
    size: 14,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  })
  page.drawText(`Nonemployee Compensation — Tax Year ${data.taxYear}`, {
    x: margin + 80,
    y: formY - 18,
    size: 9,
    font: helvetica,
    color: rgb(0.2, 0.2, 0.2),
  })

  if (data.copy) {
    page.drawText(`Copy ${data.copy}`, {
      x: formWidth + margin - 50,
      y: formY - 18,
      size: 9,
      font: helveticaBold,
      color: rgb(0.2, 0.2, 0.2),
    })
  }

  // ── PAYER section ──────────────────────────────────────────────────────────
  const payerY = formY - 30
  const payerBoxHeight = 80
  drawBox(page, margin, payerY - payerBoxHeight, 220, payerBoxHeight)

  drawLabel(page, "PAYER'S name, street address, city, state, and ZIP code", margin + 4, payerY - 12, helvetica)
  drawValue(page, data.payer.name, margin + 4, payerY - 25, helveticaBold, 10)
  drawValue(page, data.payer.streetAddress, margin + 4, payerY - 37, helvetica)
  drawValue(
    page,
    `${data.payer.city}, ${data.payer.state} ${data.payer.zip}`,
    margin + 4,
    payerY - 49,
    helvetica,
  )
  drawLabel(page, "PAYER'S TIN", margin + 4, payerY - 63, helvetica)
  drawValue(page, data.payer.ein, margin + 4, payerY - 74, helvetica)

  // ── RECIPIENT section ──────────────────────────────────────────────────────
  const recipientX = margin + 230
  drawBox(page, recipientX, payerY - payerBoxHeight, 200, payerBoxHeight)

  drawLabel(page, "RECIPIENT'S name, street address, city, state, and ZIP code", recipientX + 4, payerY - 12, helvetica)
  drawValue(page, data.recipient.name, recipientX + 4, payerY - 25, helveticaBold, 10)
  drawValue(page, data.recipient.streetAddress, recipientX + 4, payerY - 37, helvetica)
  drawValue(
    page,
    `${data.recipient.city}, ${data.recipient.state} ${data.recipient.zip}`,
    recipientX + 4,
    payerY - 49,
    helvetica,
  )
  drawLabel(page, "RECIPIENT'S TIN", recipientX + 4, payerY - 63, helvetica)
  if (data.recipient.tin) {
    const maskedTin =
      data.recipient.tinType === 'ssn'
        ? `XXX-XX-${data.recipient.tin.slice(-4)}`
        : `XX-XXXX${data.recipient.tin.slice(-3)}`
    drawValue(page, maskedTin, recipientX + 4, payerY - 74, helvetica)
  }

  // ── Account number ─────────────────────────────────────────────────────────
  const acctX = recipientX + 210
  drawBox(page, acctX, payerY - payerBoxHeight, formWidth - (acctX - margin), payerBoxHeight)
  drawLabel(page, 'Account number (optional)', acctX + 4, payerY - 12, helvetica)
  if (data.recipient.accountNumber) {
    drawValue(page, data.recipient.accountNumber, acctX + 4, payerY - 25, helvetica)
  }

  // ── Amount boxes ──────────────────────────────────────────────────────────
  const amtY = payerY - payerBoxHeight - 4
  const amtBoxH = 52
  const amtBoxW = 120

  // Box 1: Nonemployee compensation
  drawBox(page, margin, amtY - amtBoxH, amtBoxW, amtBoxH)
  drawLabel(page, '1  Nonemployee compensation', margin + 4, amtY - 12, helvetica)
  drawValue(
    page,
    `$${formatCurrency(data.nonemployeeCompensationCents)}`,
    margin + 4,
    amtY - 36,
    helveticaBold,
    14,
    rgb(0, 0, 0.6),
  )

  // Box 2: Direct sales indicator checkbox
  const box2X = margin + amtBoxW + 4
  drawBox(page, box2X, amtY - amtBoxH, 80, amtBoxH)
  drawLabel(page, '2  Direct sales of $5,000 or more', box2X + 4, amtY - 12, helvetica)
  drawLabel(page, '☐ Check if applicable', box2X + 4, amtY - 30, helvetica, 7)

  // Box 3: (reserved)
  const box3X = box2X + 84
  drawBox(page, box3X, amtY - amtBoxH, 80, amtBoxH)
  drawLabel(page, '3  (reserved)', box3X + 4, amtY - 12, helvetica)

  // Box 4: Federal income tax withheld
  const box4X = box3X + 84
  drawBox(page, box4X, amtY - amtBoxH, amtBoxW, amtBoxH)
  drawLabel(page, '4  Federal income tax withheld', box4X + 4, amtY - 12, helvetica)
  const withheld = data.federalTaxWithheldCents ?? 0
  drawValue(
    page,
    `$${formatCurrency(withheld)}`,
    box4X + 4,
    amtY - 36,
    helveticaBold,
    12,
    rgb(0, 0, 0),
  )

  // Box 5–7: State info strip
  const stateY = amtY - amtBoxH - 4
  const stateBoxH = 36
  const stateW = (formWidth / 3) | 0

  // Box 5: State
  drawBox(page, margin, stateY - stateBoxH, stateW, stateBoxH)
  drawLabel(page, "5  State", margin + 4, stateY - 10, helvetica)
  drawValue(page, data.recipient.state, margin + 4, stateY - 26, helvetica)

  // Box 6: State TIN
  drawBox(page, margin + stateW + 4, stateY - stateBoxH, stateW, stateBoxH)
  drawLabel(page, "6  State/Payer's state no.", margin + stateW + 8, stateY - 10, helvetica)

  // Box 7: State income
  drawBox(page, margin + stateW * 2 + 8, stateY - stateBoxH, formWidth - stateW * 2 - 8, stateBoxH)
  drawLabel(page, "7  State income", margin + stateW * 2 + 12, stateY - 10, helvetica)

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footerY = stateY - stateBoxH - 10
  page.drawText(
    'Form 1099-NEC (Rev. 2024)   Department of the Treasury – Internal Revenue Service',
    {
      x: margin,
      y: footerY,
      size: 6.5,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    },
  )
  page.drawText(
    'This is an informational copy. Please keep for your records.',
    {
      x: margin,
      y: footerY - 10,
      size: 6,
      font: helvetica,
      color: rgb(0.6, 0.6, 0.6),
    },
  )

  return pdfDoc.save()
}

/**
 * Generate multiple copies (B, C, 2) in a single PDF
 * Each copy gets its own page with a different header label.
 */
export async function generate1099NECPacketPdf(data: Omit<Form1099NECData, 'copy'>): Promise<Uint8Array> {
  const copies: Array<'B' | 'C' | '2'> = ['B', 'C', '2']
  const pdfDoc = await PDFDocument.create()

  for (const copy of copies) {
    const copyPdf = await generate1099NECPdf({ ...data, copy })
    const copyDoc = await PDFDocument.load(copyPdf)
    const [copiedPage] = await pdfDoc.copyPages(copyDoc, [0])
    pdfDoc.addPage(copiedPage)
  }

  return pdfDoc.save()
}
