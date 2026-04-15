import { createApiClient } from './supabase/api'

export const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]

export async function getShopifyToken(): Promise<string | null> {
  const supabase = createApiClient()
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

export interface ShopifyMoneySet {
  shop_money: { amount: string; currency_code: string }
  presentment_money: { amount: string; currency_code: string }
}

export interface ShopifyOrder {
  id: number
  name: string
  email: string
  created_at: string
  total_price: string
  currency: string
  total_price_set?: ShopifyMoneySet
  subtotal_price?: string
  subtotal_price_set?: ShopifyMoneySet
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
    price_set?: ShopifyMoneySet
    sku: string
  }[]
  shipping_lines?: {
    id: number
    title: string
    price: string
    price_set?: ShopifyMoneySet
  }[]
  customer?: {
    id: number
    first_name: string
    last_name: string
    email: string
    tax_exemptions?: string[]
  }
  note_attributes?: { name: string; value: string }[]
}

/** Get presentment (customer-facing) amount from a money set, falling back to raw value */
export function getPresentmentAmount(set: ShopifyMoneySet | undefined, fallback: string): string {
  return set?.presentment_money?.amount ?? fallback
}

/** Get the presentment (customer-facing) currency code */
export function getPresentmentCurrency(order: ShopifyOrder): string {
  return order.total_price_set?.presentment_money?.currency_code ?? order.currency
}

export type InvoiceType = 'reverse_charge' | 'commercial' | 'standard'

export async function fetchCustomerTaxNumber(customerId: number): Promise<string | null> {
  try {
    const data = await shopifyFetch(`customers/${customerId}.json`)
    const customer = data.customer
    if (customer?.tax_number) return customer.tax_number
    return null
  } catch {
    return null
  }
}

export function detectInvoiceType(order: ShopifyOrder, taxNumber?: string | null): InvoiceType {
  const countryCode = order.billing_address?.country_code || order.shipping_address?.country_code

  if (!countryCode) return 'standard'

  // Germany = standard domestic invoice
  if (countryCode === 'DE') return 'standard'

  // EU country (not DE)
  if (EU_COUNTRIES.includes(countryCode)) {
    // If customer has tax exemption or tax number → reverse charge
    const hasVatExemption = order.customer?.tax_exemptions?.includes('eu_vat_exempt')
    if (hasVatExemption || taxNumber) return 'reverse_charge'
    // EU without VAT info → still reverse charge (B2B default for EU)
    return 'reverse_charge'
  }

  // Non-EU = commercial invoice (export)
  return 'commercial'
}
