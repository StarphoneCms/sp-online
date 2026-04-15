import { NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/api'
import { shopifyFetch, type ShopifyOrder } from '@/lib/shopify'
import { generateInvoicePdf } from '@/lib/generate-pdf'

export async function GET(
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

  let order: ShopifyOrder | null = null
  try {
    const data = await shopifyFetch(`orders/${invoice.shopify_order_id}.json`)
    order = data.order
  } catch {
    // Order may have been deleted
  }

  const pdfOutput = generateInvoicePdf(invoice, order)

  return new Response(pdfOutput, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.invoice_number}.pdf"`,
    },
  })
}
