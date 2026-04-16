import { jsPDF } from 'jspdf'
import { getPresentmentAmount, type ShopifyOrder } from '@/lib/shopify'
import { LOGO_BASE64 } from '@/lib/logo'

const BLUE = { r: 59, g: 130, b: 246 }
const DARK = { r: 17, g: 24, b: 39 }
const GRAY = { r: 107, g: 114, b: 128 }
const LIGHT_GRAY = { r: 243, g: 244, b: 246 }
const WHITE = { r: 255, g: 255, b: 255 }
const BLUE_BG = { r: 239, g: 246, b: 255 }

type Color = { r: number; g: number; b: number }

function setColor(doc: jsPDF, c: Color) {
  doc.setTextColor(c.r, c.g, c.b)
}
function setFill(doc: jsPDF, c: Color) {
  doc.setFillColor(c.r, c.g, c.b)
}

interface InvoiceRecord {
  invoice_number: string
  shopify_order_number: string
  invoice_type: string
  customer_name: string | null
  customer_vat: string | null
  amount: string
  currency: string
  created_at: string
  hs_code?: string | null
  country_of_origin?: string | null
}

export function generateInvoicePdf(
  invoice: InvoiceRecord,
  order: ShopifyOrder | null
): ArrayBuffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const mL = 18
  const mR = pageW - 18
  const cW = mR - mL

  const invoiceDate = new Date(invoice.created_at)
  const dueDate = new Date(invoiceDate)
  dueDate.setDate(dueDate.getDate() + 14)
  const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  // ─── 1. HEADER ─────────────────────────────────────────
  doc.addImage(`data:image/jpeg;base64,${LOGO_BASE64}`, 'JPEG', mL, 10, 50, 12.5)

  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  setColor(doc, { r: 200, g: 200, b: 200 })
  doc.text('INVOICE', mR, 20, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  setColor(doc, DARK)
  doc.text(invoice.invoice_number, mR, 26, { align: 'right' })

  doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b)
  doc.setLineWidth(0.8)
  doc.line(mL, 31, mR, 31)
  doc.setLineWidth(0.2)

  // ─── 2. INVOICE META ──────────────────────────────────
  let y = 38
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  setColor(doc, GRAY)

  const metaLeft = [
    ['Invoice No.', invoice.invoice_number],
    ['Date', fmtDate(invoiceDate)],
    ['Order Ref.', invoice.shopify_order_number],
  ]
  const metaRight = [
    ['Payment Due', fmtDate(dueDate)],
    ['Currency', invoice.currency || 'EUR'],
    ['Terms', 'Net 14 days'],
  ]

  metaLeft.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'normal')
    setColor(doc, GRAY)
    doc.text(label, mL, y + i * 5)
    doc.setFont('helvetica', 'bold')
    setColor(doc, DARK)
    doc.text(value, mL + 28, y + i * 5)
  })

  metaRight.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'normal')
    setColor(doc, GRAY)
    doc.text(label, 120, y + i * 5)
    doc.setFont('helvetica', 'bold')
    setColor(doc, DARK)
    doc.text(value, 120 + 28, y + i * 5)
  })

  // ─── 3. FROM / TO ─────────────────────────────────────
  y = 60

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  setColor(doc, BLUE)
  doc.text('FROM', mL, y)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  setColor(doc, DARK)
  doc.text('Ali Kaan Yilmaz e.K. - Starphone', mL, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  setColor(doc, GRAY)
  doc.text('Blondelstr. 10, 52062 Aachen, Germany', mL, y + 9.5)
  doc.text('VAT: DE325873838', mL, y + 14)
  doc.text('Tax No.: 201/5463/8554', mL, y + 18.5)

  const toX = 120
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  setColor(doc, BLUE)
  doc.text('TO', toX, y)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  setColor(doc, DARK)
  doc.text(invoice.customer_name || '\u2014', toX, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  setColor(doc, GRAY)
  let toY = y + 9.5
  if (order?.billing_address) {
    const a = order.billing_address
    if (a.company) {
      doc.text(a.company, toX, toY)
      toY += 4
    }
    doc.text(a.address1, toX, toY)
    toY += 4
    if (a.address2) {
      doc.text(a.address2, toX, toY)
      toY += 4
    }
    doc.text(`${a.zip} ${a.city}`, toX, toY)
    toY += 4
    doc.text(a.country, toX, toY)
    toY += 4
  }
  if (invoice.customer_vat) {
    doc.setFont('helvetica', 'bold')
    setColor(doc, DARK)
    doc.text(`VAT ID: ${invoice.customer_vat}`, toX, toY)
  }

  // ─── 4. LINE ITEMS TABLE ──────────────────────────────
  y = 96
  const c = { num: mL, desc: mL + 10, qty: 130, unit: 158, total: mR }
  const rowH = 6

  setFill(doc, DARK)
  doc.rect(mL, y - 4, cW, rowH + 1, 'F')

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  setColor(doc, WHITE)
  doc.text('#', c.num + 2, y)
  doc.text('Description', c.desc, y)
  doc.text('Qty', c.qty, y, { align: 'right' })
  doc.text('Unit Price', c.unit, y, { align: 'right' })
  doc.text('Total', c.total, y, { align: 'right' })

  y += rowH + 1

  const cur = invoice.currency || 'EUR'
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  const lineItems = order?.line_items || []
  let subtotal = 0
  let rowIdx = 0

  lineItems.forEach((item) => {
    const price = parseFloat(getPresentmentAmount(item.price_set, item.price))
    const lineTotal = item.quantity * price
    subtotal += lineTotal

    if (rowIdx % 2 === 1) {
      setFill(doc, LIGHT_GRAY)
      doc.rect(mL, y - 3.5, cW, rowH, 'F')
    }

    setColor(doc, GRAY)
    doc.text(String(rowIdx + 1), c.num + 2, y)
    setColor(doc, DARK)
    const titleText = item.title.length > 55 ? item.title.substring(0, 52) + '...' : item.title
    doc.text(titleText, c.desc, y)
    setColor(doc, GRAY)
    doc.text(String(item.quantity), c.qty, y, { align: 'right' })
    doc.text(`${price.toFixed(2)} ${cur}`, c.unit, y, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    setColor(doc, DARK)
    doc.text(`${lineTotal.toFixed(2)} ${cur}`, c.total, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += rowH
    rowIdx++
  })

  const shippingLines = order?.shipping_lines || []
  shippingLines.forEach((shipping) => {
    const shippingPrice = parseFloat(getPresentmentAmount(shipping.price_set, shipping.price))
    subtotal += shippingPrice

    if (rowIdx % 2 === 1) {
      setFill(doc, LIGHT_GRAY)
      doc.rect(mL, y - 3.5, cW, rowH, 'F')
    }

    setColor(doc, GRAY)
    doc.text(String(rowIdx + 1), c.num + 2, y)
    setColor(doc, DARK)
    doc.text(`Shipping: ${shipping.title}`, c.desc, y)
    setColor(doc, GRAY)
    doc.text('1', c.qty, y, { align: 'right' })
    doc.text(`${shippingPrice.toFixed(2)} ${cur}`, c.unit, y, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    setColor(doc, DARK)
    doc.text(`${shippingPrice.toFixed(2)} ${cur}`, c.total, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += rowH
    rowIdx++
  })

  if (lineItems.length === 0 && shippingLines.length === 0) {
    setColor(doc, GRAY)
    doc.text('(Line items not available)', c.desc, y)
    subtotal = parseFloat(invoice.amount) || 0
    y += rowH
  }

  doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b)
  doc.setLineWidth(0.4)
  doc.line(mL, y - 2, mR, y - 2)
  doc.setLineWidth(0.2)

  // ─── 5. TOTALS BOX ───────────────────────────────────
  y += 4
  const totalsX = 130
  const totalsValX = mR

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  setColor(doc, GRAY)

  let vatLabel: string
  let vatAmount: number
  let netAmount: number

  if (invoice.invoice_type === 'standard') {
    netAmount = subtotal / 1.19
    vatAmount = subtotal - netAmount
    vatLabel = 'VAT (19%)'
  } else if (invoice.invoice_type === 'reverse_charge') {
    netAmount = subtotal
    vatAmount = 0
    vatLabel = 'VAT (0% Reverse Charge)'
  } else {
    netAmount = subtotal
    vatAmount = 0
    vatLabel = 'VAT (0% Export)'
  }

  doc.text('Subtotal', totalsX, y)
  setColor(doc, DARK)
  doc.text(`${netAmount.toFixed(2)} ${cur}`, totalsValX, y, { align: 'right' })

  y += 5.5
  setColor(doc, GRAY)
  doc.text(vatLabel, totalsX, y)
  setColor(doc, DARK)
  doc.text(`${vatAmount.toFixed(2)} ${cur}`, totalsValX, y, { align: 'right' })

  y += 4
  doc.setDrawColor(DARK.r, DARK.g, DARK.b)
  doc.setLineWidth(0.6)
  doc.line(totalsX, y, mR, y)
  doc.setLineWidth(0.2)

  y += 5.5
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  setColor(doc, DARK)
  doc.text('TOTAL', totalsX, y)
  doc.text(`${(parseFloat(invoice.amount) || subtotal).toFixed(2)} ${cur}`, totalsValX, y, { align: 'right' })

  // ─── 6. LEGAL TEXT BOX ────────────────────────────────
  y += 14

  let legalText = ''
  if (invoice.invoice_type === 'reverse_charge') {
    legalText =
      'Tax liability transfers to the recipient pursuant to Art. 196 EU VAT Directive / ' +
      `\u00a713b UStG (Reverse Charge). Customer VAT ID: ${invoice.customer_vat || '\u2014'}`
  } else if (invoice.invoice_type === 'commercial') {
    legalText =
      'VAT-exempt export delivery pursuant to \u00a74 No. 1a UStG. ' +
      `Customs Value: ${(parseFloat(invoice.amount) || subtotal).toFixed(2)} ${cur}`
  } else {
    legalText = 'All prices include 19% VAT. Payment due within 14 days.'
  }

  setFill(doc, BLUE_BG)
  const legalBoxH = 12
  doc.rect(mL, y - 3, cW, legalBoxH, 'F')

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b)
  doc.rect(mL, y - 3, 1.2, legalBoxH, 'F')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  setColor(doc, DARK)
  doc.text(legalText, mL + 5, y + 1, { maxWidth: cW - 10 })

  if (invoice.invoice_type === 'commercial') {
    y += legalBoxH + 6

    // Export Details box
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    setColor(doc, BLUE)
    doc.text('EXPORT DETAILS', mL, y)

    y += 5
    doc.setFontSize(7.5)
    setColor(doc, GRAY)
    doc.setFont('helvetica', 'normal')

    const hsCode = invoice.hs_code || '\u2014'
    const origin = invoice.country_of_origin || 'DE'
    const customsVal = `${(parseFloat(invoice.amount) || subtotal).toFixed(2)} ${cur}`

    doc.text('HS Code:', mL, y)
    doc.setFont('helvetica', 'bold')
    setColor(doc, DARK)
    doc.text(hsCode, mL + 28, y)

    y += 5
    doc.setFont('helvetica', 'normal')
    setColor(doc, GRAY)
    doc.text('Country of Origin:', mL, y)
    doc.setFont('helvetica', 'bold')
    setColor(doc, DARK)
    doc.text(origin, mL + 28, y)

    y += 5
    doc.setFont('helvetica', 'normal')
    setColor(doc, GRAY)
    doc.text('Customs Value:', mL, y)
    doc.setFont('helvetica', 'bold')
    setColor(doc, DARK)
    doc.text(customsVal, mL + 28, y)
  }

  // ─── 7. FOOTER ────────────────────────────────────────
  const footerY = 272
  doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b)
  doc.setLineWidth(0.5)
  doc.line(mL, footerY, mR, footerY)
  doc.setLineWidth(0.2)

  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  setColor(doc, GRAY)

  const f1 = mL
  doc.setFont('helvetica', 'bold')
  doc.text('Bank Details', f1, footerY + 4.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Aachener Bank', f1, footerY + 8.5)
  doc.text('IBAN: DE16 3906 0180 0168 3170 00', f1, footerY + 12)
  doc.text('BIC: GENODED1AAC', f1, footerY + 15.5)

  const f2 = 80
  doc.setFont('helvetica', 'bold')
  doc.text('Company', f2, footerY + 4.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Ali Kaan Yilmaz e.K. - Starphone', f2, footerY + 8.5)
  doc.text('VAT: DE325873838', f2, footerY + 12)
  doc.text('Tax No.: 201/5463/8554', f2, footerY + 15.5)

  const f3 = 145
  doc.setFont('helvetica', 'bold')
  doc.text('Contact', f3, footerY + 4.5)
  doc.setFont('helvetica', 'normal')
  doc.text('info@starphone.de', f3, footerY + 8.5)
  doc.text('0241 401 37 37', f3, footerY + 12)
  doc.text('starphone.de', f3, footerY + 15.5)

  return doc.output('arraybuffer')
}
