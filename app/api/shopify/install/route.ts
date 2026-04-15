import { NextResponse } from 'next/server'

export async function GET() {
  const shop = process.env.SHOPIFY_SHOP!
  const clientId = process.env.SHOPIFY_CLIENT_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/callback`
  const scopes = 'read_orders,read_customers'

  const installUrl =
    `https://${shop}/admin/oauth/authorize?` +
    `client_id=${clientId}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`

  return NextResponse.redirect(installUrl)
}
