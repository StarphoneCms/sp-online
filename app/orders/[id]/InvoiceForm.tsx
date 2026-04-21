"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type ShopifyOrder, type InvoiceType, getPresentmentAmount, getPresentmentCurrency } from "@/lib/shopify";
import { createClient } from "@/lib/supabase/client";
import { roundMoney } from "@/lib/format";

const VAT_REGEX = /^(AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|GR|HU|IE|IT|LV|LT|LU|MT|NL|PL|PT|RO|SK|SI|ES|SE)[A-Z0-9]{2,13}$/;

function isValidVatFormat(vat: string): boolean {
  return VAT_REGEX.test(vat.replace(/\s/g, "").toUpperCase());
}

export default function InvoiceForm({
  order,
  detectedType,
  shopifyTaxNumber,
}: {
  order: ShopifyOrder;
  detectedType: InvoiceType;
  shopifyTaxNumber?: string | null;
}) {
  const router = useRouter();
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(detectedType);
  const [vatNumber, setVatNumber] = useState(shopifyTaxNumber || "");
  const [vatTouched, setVatTouched] = useState(!!shopifyTaxNumber);
  const [hsCode, setHsCode] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("DE");
  const [saving, setSaving] = useState(false);

  const customerName =
    order.billing_address?.name ||
    (order.customer
      ? `${order.customer.first_name} ${order.customer.last_name}`
      : "");

  const vatNormalized = vatNumber.replace(/\s/g, "").toUpperCase();
  const vatValid = vatNormalized.length > 0 && isValidVatFormat(vatNormalized);
  const vatInvalid = vatTouched && vatNormalized.length > 0 && !vatValid;

  // Use presentment currency (what the customer paid in)
  const cur = getPresentmentCurrency(order);
  const totalAmount = roundMoney(
    parseFloat(getPresentmentAmount(order.total_price_set, order.total_price))
  );

  // Build line items snapshot from Shopify (so PDF and detail page can render them)
  const builtLineItems = [
    ...order.line_items.map((item) => ({
      description: item.title,
      quantity: item.quantity,
      price: roundMoney(
        parseFloat(getPresentmentAmount(item.price_set, item.price))
      ),
    })),
    ...(order.shipping_lines || []).map((shipping) => ({
      description: `Versand: ${shipping.title}`,
      quantity: 1,
      price: roundMoney(
        parseFloat(getPresentmentAmount(shipping.price_set, shipping.price))
      ),
    })),
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (invoiceType === "reverse_charge" && !vatValid) {
      setVatTouched(true);
      return;
    }

    setSaving(true);

    const supabase = createClient();
    const invoiceNumber = `RE-${order.name.replace("#", "")}-${Date.now()}`;

    const taxRate = invoiceType === "standard" ? 19 : 0;
    const taxAmount =
      invoiceType === "standard"
        ? roundMoney(totalAmount - totalAmount / 1.19)
        : 0;
    const subtotalForInvoice =
      invoiceType === "standard" ? roundMoney(totalAmount / 1.19) : totalAmount;

    const customerAddressParts = order.billing_address
      ? [
          order.billing_address.company,
          order.billing_address.address1,
          order.billing_address.address2,
          `${order.billing_address.zip} ${order.billing_address.city}`,
          order.billing_address.country,
        ].filter(Boolean)
      : [];

    const { data, error } = await supabase
      .from("shopify_invoices")
      .insert({
        shopify_order_id: String(order.id),
        shopify_order_number: order.name,
        invoice_number: invoiceNumber,
        invoice_type: invoiceType,
        customer_name: customerName,
        customer_email: order.email,
        customer_vat: invoiceType === "reverse_charge" ? vatNormalized : null,
        customer_address: customerAddressParts.join("\n") || null,
        line_items: builtLineItems,
        subtotal: subtotalForInvoice,
        shipping: 0,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        amount: totalAmount,
        currency: cur,
        is_manual: false,
        hs_code: invoiceType === "commercial" ? hsCode || null : null,
        country_of_origin: invoiceType === "commercial" ? countryOfOrigin || null : null,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      alert("Fehler beim Speichern: " + (error?.message || "Unbekannter Fehler"));
    } else {
      router.push(`/invoices/${data.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Rechnungstyp
        </label>
        <select
          value={invoiceType}
          onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        >
          <option value="standard">Standard</option>
          <option value="reverse_charge">Reverse Charge</option>
          <option value="commercial">Commercial Invoice</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Kundenname
          </label>
          <input
            type="text"
            value={customerName}
            readOnly
            className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            E-Mail
          </label>
          <input
            type="text"
            value={order.email || ""}
            readOnly
            className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {order.billing_address && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Rechnungsadresse
          </label>
          <p className="mt-1 text-sm text-gray-600">
            {order.billing_address.company && (
              <>
                {order.billing_address.company}
                <br />
              </>
            )}
            {order.billing_address.address1}
            {order.billing_address.address2 && (
              <>
                <br />
                {order.billing_address.address2}
              </>
            )}
            <br />
            {order.billing_address.zip} {order.billing_address.city}
            <br />
            {order.billing_address.country}
          </p>
        </div>
      )}

      {invoiceType === "reverse_charge" && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <p className="text-xs font-medium text-purple-800 mb-3">
            Steuerschuldnerschaft des Leistungsempfängers (Reverse Charge) gem.
            Art. 196 MwStSystRL / § 13b UStG. Die Umsatzsteuer ist vom
            Leistungsempfänger zu entrichten.
          </p>
          <label className="block text-sm font-medium text-purple-900">
            USt-IdNr. des Kunden *
          </label>
          <div className="relative mt-1">
            <input
              type="text"
              value={vatNumber}
              onChange={(e) => {
                setVatNumber(e.target.value);
                if (!vatTouched) setVatTouched(true);
              }}
              onBlur={() => setVatTouched(true)}
              placeholder="z.B. ATU12345678"
              required
              className={`block w-full rounded-md border bg-white px-3 py-2 pr-10 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                vatValid
                  ? "border-green-400 focus:border-green-500 focus:ring-green-500"
                  : vatInvalid
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                    : "border-purple-300 focus:border-purple-500 focus:ring-purple-500"
              }`}
            />
            {vatValid && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-lg">
                &#10003;
              </span>
            )}
            {vatInvalid && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 text-lg">
                &#10007;
              </span>
            )}
          </div>
          {vatInvalid && (
            <p className="mt-1 text-xs text-red-600">
              Ungültiges Format. USt-IdNr. muss mit 2-stelligem Ländercode beginnen, gefolgt von Zahlen/Buchstaben (z.B. DE123456789, NL123456789B01).
            </p>
          )}
        </div>
      )}

      {invoiceType === "commercial" && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3">
          <p className="text-xs font-medium text-orange-800">
            Steuerfreie Ausfuhrlieferung gem. § 4 Nr. 1a i.V.m. § 6 UStG.
          </p>
          <div>
            <label className="block text-sm font-medium text-orange-900">
              HS-Code (Zolltarifnummer)
            </label>
            <input
              type="text"
              value={hsCode}
              onChange={(e) => setHsCode(e.target.value)}
              placeholder="z.B. 8517.12.00"
              className="mt-1 block w-full rounded-md border border-orange-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-orange-900">
              Warenursprung
            </label>
            <input
              type="text"
              value={countryOfOrigin}
              onChange={(e) => setCountryOfOrigin(e.target.value)}
              placeholder="z.B. DE"
              className="mt-1 block w-full rounded-md border border-orange-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Positionen</h3>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Artikel
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  SKU
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                  Menge
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                  Preis ({cur})
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {order.line_items.map((item) => {
                const price = getPresentmentAmount(item.price_set, item.price);
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {item.title}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {item.sku || "\u2014"}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-gray-600">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-gray-600">
                      {parseFloat(price).toFixed(2)} {cur}
                    </td>
                  </tr>
                );
              })}
              {order.shipping_lines?.map((shipping) => {
                const shippingPrice = getPresentmentAmount(shipping.price_set, shipping.price);
                return (
                  <tr key={shipping.id} className="bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-600" colSpan={2}>
                      Versand: {shipping.title}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-gray-600">
                      1
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-gray-600">
                      {parseFloat(shippingPrice).toFixed(2)} {cur}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-2 text-right text-sm font-medium text-gray-700"
                >
                  Gesamt
                </td>
                <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                  {totalAmount.toFixed(2)} {cur}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving || (invoiceType === "reverse_charge" && !vatValid)}
        className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        {saving ? "Wird gespeichert..." : "Rechnung erstellen"}
      </button>
    </form>
  );
}
