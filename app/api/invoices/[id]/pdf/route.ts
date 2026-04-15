import { NextRequest } from 'next/server'
import { jsPDF } from 'jspdf'
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

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const marginL = 15
  const marginR = pageW - 15
  const contentW = marginR - marginL

  // ─── HEADER ──────────────────────────────────────────
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('STARPHONE', marginL, 18)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Ali Kaan Yilmaz e.K. | Blondelstr. 10 | 52062 Aachen | Deutschland', marginL, 24)
  doc.text('USt-IdNr.: DE351498498 | Steuernr.: 201/5140/4737', marginL, 28)
  doc.text('Tel: +49 241 91999944 | info@starphone.de', marginL, 32)

  doc.setDrawColor(200)
  doc.line(marginL, 35, marginR, 35)

  // ─── TITLE ───────────────────────────────────────────
  let title = 'RECHNUNG'
  if (invoice.invoice_type === 'commercial') title = 'COMMERCIAL INVOICE'

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(title, marginL, 44)

  // ─── INVOICE META ────────────────────────────────────
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Rechnungsnr.: ${invoice.invoice_number}`, marginL, 52)
  doc.text(`Datum: ${new Date(invoice.created_at).toLocaleDateString('de-DE')}`, marginL, 56)
  doc.text(`Bestellung: ${invoice.shopify_order_number}`, marginL, 60)

  // ─── SENDER & RECIPIENT ─────────────────────────────
  const addrY = 70
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Absender:', marginL, addrY)
  doc.setFont('helvetica', 'normal')
  doc.text('Ali Kaan Yilmaz e.K.', marginL, addrY + 4)
  doc.text('Blondelstr. 10', marginL, addrY + 8)
  doc.text('52062 Aachen, DE', marginL, addrY + 12)

  const recipientX = 110
  doc.setFont('helvetica', 'bold')
  doc.text('Empf\u00e4nger:', recipientX, addrY)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.customer_name || '\u2014', recipientX, addrY + 4)

  let ry = addrY + 8
  if (order?.billing_address) {
    const addr = order.billing_address
    if (addr.company) {
      doc.text(addr.company, recipientX, ry)
      ry += 4
    }
    doc.text(addr.address1, recipientX, ry)
    ry += 4
    if (addr.address2) {
      doc.text(addr.address2, recipientX, ry)
      ry += 4
    }
    doc.text(`${addr.zip} ${addr.city}`, recipientX, ry)
    ry += 4
    doc.text(addr.country, recipientX, ry)
    ry += 4
  }
  if (invoice.customer_vat) {
    doc.text(`USt-IdNr.: ${invoice.customer_vat}`, recipientX, ry)
  }

  // ─── LINE ITEMS TABLE ───────────────────────────────
  let tableY = 100
  doc.setDrawColor(180)
  doc.line(marginL, tableY, marginR, tableY)
  tableY += 5

  const col = { pos: marginL, desc: 25, qty: 120, unit: 145, total: 175 }

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('Pos', col.pos, tableY)
  doc.text('Beschreibung', col.desc, tableY)
  doc.text('Menge', col.qty, tableY, { align: 'right' })
  doc.text('Einzelpreis', col.unit, tableY, { align: 'right' })
  doc.text('Gesamt', marginR, tableY, { align: 'right' })

  tableY += 3
  doc.line(marginL, tableY, marginR, tableY)
  tableY += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  const lineItems = order?.line_items || []
  let subtotal = 0

  lineItems.forEach((item, i) => {
    const lineTotal = item.quantity * parseFloat(item.price)
    subtotal += lineTotal

    doc.text(String(i + 1), col.pos, tableY)
    // Truncate long titles
    const titleText = item.title.length > 50 ? item.title.substring(0, 47) + '...' : item.title
    doc.text(titleText, col.desc, tableY)
    doc.text(String(item.quantity), col.qty, tableY, { align: 'right' })
    doc.text(`${parseFloat(item.price).toFixed(2)} ${invoice.currency}`, col.unit, tableY, { align: 'right' })
    doc.text(`${lineTotal.toFixed(2)} ${invoice.currency}`, marginR, tableY, { align: 'right' })
    tableY += 5
  })

  if (lineItems.length === 0) {
    doc.text('(Positionen nicht verf\u00fcgbar)', col.desc, tableY)
    subtotal = parseFloat(invoice.amount) || 0
    tableY += 5
  }

  // ─── TOTALS ──────────────────────────────────────────
  tableY += 3
  doc.line(col.unit - 10, tableY, marginR, tableY)
  tableY += 5

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')

  if (invoice.invoice_type === 'standard') {
    const netAmount = subtotal / 1.19
    const vatAmount = subtotal - netAmount
    doc.text('Nettobetrag:', col.unit - 10, tableY)
    doc.text(`${netAmount.toFixed(2)} ${invoice.currency}`, marginR, tableY, { align: 'right' })
    tableY += 5
    doc.text('MwSt. 19%:', col.unit - 10, tableY)
    doc.text(`${vatAmount.toFixed(2)} ${invoice.currency}`, marginR, tableY, { align: 'right' })
    tableY += 5
  } else {
    doc.text('Nettobetrag:', col.unit - 10, tableY)
    doc.text(`${subtotal.toFixed(2)} ${invoice.currency}`, marginR, tableY, { align: 'right' })
    tableY += 5
    doc.text('MwSt. 0%:', col.unit - 10, tableY)
    doc.text(`0.00 ${invoice.currency}`, marginR, tableY, { align: 'right' })
    tableY += 5
  }

  doc.setFont('helvetica', 'bold')
  doc.text('Gesamtbetrag:', col.unit - 10, tableY)
  doc.text(`${(parseFloat(invoice.amount) || subtotal).toFixed(2)} ${invoice.currency}`, marginR, tableY, { align: 'right' })
  tableY += 10

  // ─── COMMERCIAL INVOICE FIELDS ──────────────────────
  if (invoice.invoice_type === 'commercial') {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text('HS-Code: \u2014', marginL, tableY)
    doc.text('Country of Origin: DE', marginL, tableY + 4)
    doc.text(`Customs Value: ${(parseFloat(invoice.amount) || subtotal).toFixed(2)} ${invoice.currency}`, marginL, tableY + 8)
    tableY += 16
  }

  // ─── LEGAL TEXT ──────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)

  if (invoice.invoice_type === 'reverse_charge') {
    doc.text(
      'Steuerschuldnerschaft des Leistungsempf\u00e4ngers gem\u00e4\u00df \u00a713b UStG (Reverse Charge). ' +
      `USt-IdNr. des Leistungsempf\u00e4ngers: ${invoice.customer_vat || '\u2014'}`,
      marginL, tableY, { maxWidth: contentW }
    )
  } else if (invoice.invoice_type === 'commercial') {
    doc.text(
      'Steuerfreie Ausfuhrlieferung gem\u00e4\u00df \u00a74 Nr. 1a UStG.',
      marginL, tableY, { maxWidth: contentW }
    )
  }

  // ─── FOOTER ──────────────────────────────────────────
  const footerY = 272
  doc.setDrawColor(200)
  doc.line(marginL, footerY, marginR, footerY)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.text('Ali Kaan Yilmaz e.K. | Blondelstr. 10 | 52062 Aachen', marginL, footerY + 4)
  doc.text('Sparkasse Aachen | IBAN: DE91 3905 0000 1073 5765 63 | BIC: AACSDE33', marginL, footerY + 8)
  doc.text('USt-IdNr.: DE351498498 | Steuernr.: 201/5140/4737 | info@starphone.de', marginL, footerY + 12)

  const pdfOutput = doc.output('arraybuffer')

  return new Response(pdfOutput, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.invoice_number}.pdf"`,
    },
  })
}
