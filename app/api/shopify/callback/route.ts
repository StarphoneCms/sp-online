import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')

  if (!code || !shop) {
    return NextResponse.json({ error: 'Missing code or shop' }, { status: 400 })
  }

  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID!,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET!,
      code,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.json(
      { error: 'Failed to get access token' },
      { status: 500 }
    )
  }

  const { access_token } = await tokenRes.json()

  const supabase = createApiClient()
  await supabase.from('shopify_tokens').upsert(
    { shop, access_token },
    { onConflict: 'shop' }
  )

  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL!))
}
