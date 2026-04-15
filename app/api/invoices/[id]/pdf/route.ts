import { NextRequest } from 'next/server'
import PDFDocument from 'pdfkit'
import { createServerComponentClient } from '@/lib/supabase/server'
import { shopifyFetch, type ShopifyOrder } from '@/lib/shopify'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerComponentClient()

  const { data: invoice, error } = await supabase
    .from('shopify_invoices')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !invoice) {
    return Response.json({ error: 'Invoice not found' }, { status: 404 })
  }

  let order: ShopifyOrder | null = null
  try {
    const data = await shopifyFetch(`orders/${invoice.shopify_order_id}.json`)
    order = data.order
  } catch {
    // Order may have been deleted — generate PDF with invoice data only
  }

  const chunks: Buffer[] = []
  const doc = new PDFDocument({ size: 'A4', margin: 50 })

  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  const pdfReady = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  // ─── HEADER ──────────────────────────────────────────
  doc.fontSize(20).font('Helvetica-Bold').text('STARPHONE', 50, 50)
  doc.fontSize(8).font('Helvetica').text(
    'Ali Kaan Yilmaz e.K. | Blondelstr. 10 | 52062 Aachen | Deutschland',
    50, 75
  )
  doc.text('USt-IdNr.: DE351498498 | Steuernr.: 201/5140/4737', 50, 85)
  doc.text('Tel: +49 241 91999944 | info@starphone.de', 50, 95)

  doc.moveTo(50, 115).lineTo(545, 115).stroke()

  // ─── TITLE ───────────────────────────────────────────
  let title = 'RECHNUNG'
  if (invoice.invoice_type === 'commercial') title = 'COMMERCIAL INVOICE'

  doc.moveDown(1)
  doc.fontSize(16).font('Helvetica-Bold').text(title, 50, 130)

  // ─── INVOICE META ────────────────────────────────────
  const metaY = 160
  doc.fontSize(9).font('Helvetica')
  doc.text(`Rechnungsnr.: ${invoice.invoice_number}`, 50, metaY)
  doc.text(`Datum: ${new Date(invoice.created_at).toLocaleDateString('de-DE')}`, 50, metaY + 12)
  doc.text(`Bestellung: ${invoice.shopify_order_number}`, 50, metaY + 24)

  // ─── SENDER & RECIPIENT ─────────────────────────────
  const addrY = 210
  doc.fontSize(9).font('Helvetica-Bold').text('Absender:', 50, addrY)
  doc.font('Helvetica')
  doc.text('Ali Kaan Yilmaz e.K.', 50, addrY + 12)
  doc.text('Blondelstr. 10', 50, addrY + 22)
  doc.text('52062 Aachen, DE', 50, addrY + 32)

  doc.font('Helvetica-Bold').text('Empfänger:', 300, addrY)
  doc.font('Helvetica')
  doc.text(invoice.customer_name || '—', 300, addrY + 12)

  let recipientY = addrY + 22
  if (order?.billing_address) {
    const addr = order.billing_address
    if (addr.company) {
      doc.text(addr.company, 300, recipientY)
      recipientY += 10
    }
    doc.text(addr.address1, 300, recipientY)
    recipientY += 10
    if (addr.address2) {
      doc.text(addr.address2, 300, recipientY)
      recipientY += 10
    }
    doc.text(`${addr.zip} ${addr.city}`, 300, recipientY)
    recipientY += 10
    doc.text(addr.country, 300, recipientY)
    recipientY += 10
  }
  if (invoice.customer_vat) {
    doc.text(`USt-IdNr.: ${invoice.customer_vat}`, 300, recipientY)
  }

  // ─── LINE ITEMS TABLE ───────────────────────────────
  let tableY = 310
  doc.moveTo(50, tableY).lineTo(545, tableY).stroke()
  tableY += 5

  doc.fontSize(8).font('Helvetica-Bold')
  doc.text('Pos', 50, tableY, { width: 30 })
  doc.text('Beschreibung', 85, tableY, { width: 230 })
  doc.text('Menge', 320, tableY, { width: 50, align: 'right' })
  doc.text('Einzelpreis', 375, tableY, { width: 75, align: 'right' })
  doc.text('Gesamt', 455, tableY, { width: 90, align: 'right' })

  tableY += 15
  doc.moveTo(50, tableY).lineTo(545, tableY).stroke()
  tableY += 5

  doc.font('Helvetica').fontSize(8)
  const lineItems = order?.line_items || []
  let subtotal = 0

  lineItems.forEach((item, i) => {
    const lineTotal = item.quantity * parseFloat(item.price)
    subtotal += lineTotal

    doc.text(String(i + 1), 50, tableY, { width: 30 })
    doc.text(item.title, 85, tableY, { width: 230 })
    doc.text(String(item.quantity), 320, tableY, { width: 50, align: 'right' })
    doc.text(`${parseFloat(item.price).toFixed(2)} ${invoice.currency}`, 375, tableY, { width: 75, align: 'right' })
    doc.text(`${lineTotal.toFixed(2)} ${invoice.currency}`, 455, tableY, { width: 90, align: 'right' })
    tableY += 14
  })

  if (lineItems.length === 0) {
    doc.text('(Positionen nicht verfügbar)', 85, tableY)
    subtotal = parseFloat(invoice.amount) || 0
    tableY += 14
  }

  // ─── TOTALS ──────────────────────────────────────────
  tableY += 5
  doc.moveTo(375, tableY).lineTo(545, tableY).stroke()
  tableY += 8

  doc.font('Helvetica').fontSize(9)

  if (invoice.invoice_type === 'standard') {
    const netAmount = subtotal / 1.19
    const vatAmount = subtotal - netAmount
    doc.text('Nettobetrag:', 375, tableY, { width: 80 })
    doc.text(`${netAmount.toFixed(2)} ${invoice.currency}`, 455, tableY, { width: 90, align: 'right' })
    tableY += 14
    doc.text('MwSt. 19%:', 375, tableY, { width: 80 })
    doc.text(`${vatAmount.toFixed(2)} ${invoice.currency}`, 455, tableY, { width: 90, align: 'right' })
    tableY += 14
  } else {
    doc.text('Nettobetrag:', 375, tableY, { width: 80 })
    doc.text(`${subtotal.toFixed(2)} ${invoice.currency}`, 455, tableY, { width: 90, align: 'right' })
    tableY += 14
    doc.text('MwSt. 0%:', 375, tableY, { width: 80 })
    doc.text(`0.00 ${invoice.currency}`, 455, tableY, { width: 90, align: 'right' })
    tableY += 14
  }

  doc.font('Helvetica-Bold')
  doc.text('Gesamtbetrag:', 375, tableY, { width: 80 })
  doc.text(`${(parseFloat(invoice.amount) || subtotal).toFixed(2)} ${invoice.currency}`, 455, tableY, { width: 90, align: 'right' })
  tableY += 25

  // ─── COMMERCIAL INVOICE FIELDS ──────────────────────
  if (invoice.invoice_type === 'commercial') {
    doc.font('Helvetica').fontSize(8)
    doc.text(`HS-Code: —`, 50, tableY)
    doc.text(`Country of Origin: DE`, 50, tableY + 12)
    doc.text(`Customs Value: ${(parseFloat(invoice.amount) || subtotal).toFixed(2)} ${invoice.currency}`, 50, tableY + 24)
    tableY += 45
  }

  // ─── LEGAL TEXT ──────────────────────────────────────
  doc.font('Helvetica').fontSize(7)

  if (invoice.invoice_type === 'reverse_charge') {
    doc.text(
      `Steuerschuldnerschaft des Leistungsempfängers gemäß §13b UStG (Reverse Charge). ` +
      `USt-IdNr. des Leistungsempfängers: ${invoice.customer_vat || '—'}`,
      50, tableY, { width: 495 }
    )
  } else if (invoice.invoice_type === 'commercial') {
    doc.text(
      'Steuerfreie Ausfuhrlieferung gemäß §4 Nr. 1a UStG.',
      50, tableY, { width: 495 }
    )
  }

  // ─── FOOTER ──────────────────────────────────────────
  const footerY = 740
  doc.moveTo(50, footerY).lineTo(545, footerY).stroke()
  doc.fontSize(7).font('Helvetica')
  doc.text('Ali Kaan Yilmaz e.K. | Blondelstr. 10 | 52062 Aachen', 50, footerY + 5)
  doc.text('Sparkasse Aachen | IBAN: DE91 3905 0000 1073 5765 63 | BIC: AACSDE33', 50, footerY + 15)
  doc.text('USt-IdNr.: DE351498498 | Steuernr.: 201/5140/4737 | info@starphone.de', 50, footerY + 25)

  doc.end()

  const pdfBuffer = await pdfReady

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.invoice_number}.pdf"`,
    },
  })
}
