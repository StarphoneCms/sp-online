import { NextRequest } from 'next/server'
import nodemailer from 'nodemailer'
import { createApiClient } from '@/lib/supabase/api'
import { shopifyFetch, type ShopifyOrder } from '@/lib/shopify'
import { generateInvoicePdf } from '@/lib/generate-pdf'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createApiClient()

  const { data: invoice, error } = await supabase
    .from('shopify_invoices')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !invoice) {
    return Response.json({ error: 'Invoice not found' }, { status: 404 })
  }

  if (!invoice.customer_email) {
    return Response.json({ error: 'No customer email address' }, { status: 400 })
  }

  let order: ShopifyOrder | null = null
  try {
    const data = await shopifyFetch(`orders/${invoice.shopify_order_id}.json`)
    order = data.order
  } catch {
    // Order may have been deleted
  }

  const pdfBuffer = Buffer.from(generateInvoicePdf(invoice, order))

  const transporter = nodemailer.createTransport({
    host: 'smtp.ionos.de',
    port: 587,
    secure: false,
    auth: {
      user: 'info@starphone.de',
      pass: process.env.IONOS_EMAIL_PASSWORD!,
    },
  })

  try {
    await transporter.sendMail({
      from: '"Starphone" <info@starphone.de>',
      to: invoice.customer_email,
      subject: `Invoice ${invoice.invoice_number} - Starphone`,
      text:
        `Dear Customer,\n\n` +
        `Please find attached the invoice ${invoice.invoice_number} for your order ${invoice.shopify_order_number}.\n\n` +
        `If you have any questions, please contact us at info@starphone.de.\n\n` +
        `Best regards,\nAli Kaan Yilmaz e.K.\nStarphone`,
      attachments: [
        {
          filename: `${invoice.invoice_number}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    return Response.json({ success: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to send email'
    return Response.json({ error: message }, { status: 500 })
  }
}
