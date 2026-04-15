import { NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/api'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createApiClient()

  const { error } = await supabase
    .from('shopify_invoices')
    .delete()
    .eq('id', id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
