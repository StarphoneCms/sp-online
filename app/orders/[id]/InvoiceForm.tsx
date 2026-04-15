"use client";

import { useState } from "react";
import { type ShopifyOrder, type InvoiceType } from "@/lib/shopify";
import { createClient } from "@/lib/supabase/client";

export default function InvoiceForm({
  order,
  detectedType,
}: {
  order: ShopifyOrder;
  detectedType: InvoiceType;
}) {
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(detectedType);
  const [vatNumber, setVatNumber] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("DE");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const customerName =
    order.billing_address?.name ||
    (order.customer
      ? `${order.customer.first_name} ${order.customer.last_name}`
      : "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const supabase = createClient();

    const invoiceNumber = `RE-${order.name.replace("#", "")}-${Date.now()}`;

    const { error } = await supabase.from("shopify_invoices").insert({
      shopify_order_id: String(order.id),
      shopify_order_number: order.name,
      invoice_number: invoiceNumber,
      invoice_type: invoiceType,
      customer_name: customerName,
      customer_email: order.email,
      customer_vat: invoiceType === "reverse_charge" ? vatNumber : null,
      amount: parseFloat(order.total_price),
      currency: order.currency,
    });

    setSaving(false);

    if (error) {
      alert("Fehler beim Speichern: " + error.message);
    } else {
      setSaved(true);
    }
  }

  if (saved) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <h3 className="text-lg font-semibold text-green-800">
          Rechnung erstellt
        </h3>
        <p className="mt-1 text-sm text-green-700">
          Die Rechnung wurde erfolgreich gespeichert.
        </p>
      </div>
    );
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
          <input
            type="text"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            placeholder="z.B. ATU12345678"
            required
            className="mt-1 block w-full rounded-md border border-purple-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
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
                  Preis
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {order.line_items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {item.title}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {item.sku || "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-gray-600">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-gray-600">
                    {item.price} {order.currency}
                  </td>
                </tr>
              ))}
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
                  {order.total_price} {order.currency}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        {saving ? "Wird gespeichert..." : "Rechnung erstellen"}
      </button>
    </form>
  );
}
