import { createServerComponentClient } from './supabase/server'

export const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]

export async function getShopifyToken(): Promise<string | null> {
  const supabase = await createServerComponentClient()
  const { data, error } = await supabase
    .from('shopify_tokens')
    .select('access_token')
    .eq('shop', process.env.SHOPIFY_SHOP!)
    .single()

  if (error || !data) return null
  return data.access_token
}

export async function shopifyFetch(endpoint: string) {
  const token = await getShopifyToken()
  if (!token) throw new Error('No Shopify token found')

  const shop = process.env.SHOPIFY_SHOP!
  const url = `https://${shop}/admin/api/2024-01/${endpoint}`

  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Shopify API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

export interface ShopifyOrder {
  id: number
  name: string
  email: string
  created_at: string
  total_price: string
  currency: string
  billing_address?: {
    country_code: string
    company?: string
    name: string
    address1: string
    address2?: string
    city: string
    zip: string
    country: string
  }
  shipping_address?: {
    country_code: string
    company?: string
    name: string
    address1: string
    address2?: string
    city: string
    zip: string
    country: string
  }
  line_items: {
    id: number
    title: string
    quantity: number
    price: string
    sku: string
  }[]
  customer?: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  note_attributes?: { name: string; value: string }[]
}

export type InvoiceType = 'reverse_charge' | 'commercial' | 'standard'

export function detectInvoiceType(order: ShopifyOrder): InvoiceType {
  const countryCode = order.billing_address?.country_code || order.shipping_address?.country_code

  if (!countryCode) return 'standard'

  // Germany = standard domestic invoice
  if (countryCode === 'DE') return 'standard'

  // EU country (not DE) = reverse charge
  if (EU_COUNTRIES.includes(countryCode)) return 'reverse_charge'

  // Non-EU = commercial invoice (export)
  return 'commercial'
}
