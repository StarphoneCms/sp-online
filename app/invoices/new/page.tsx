"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { type InvoiceType } from "@/lib/shopify";
import { formatEUR, roundMoney } from "@/lib/format";

interface LineItem {
  description: string;
  quantity: number;
  price: number;
}

const VAT_REGEX =
  /^(AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|GR|HU|IE|IT|LV|LT|LU|MT|NL|PL|PT|RO|SK|SI|ES|SE)[A-Z0-9]{2,13}$/;

const TAX_RATE_BY_TYPE: Record<InvoiceType, number> = {
  standard: 19,
  reverse_charge: 0,
  commercial: 0,
};

export default function NewInvoicePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCountry, setCustomerCountry] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerVat, setCustomerVat] = useState("");
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("standard");
  const [notes, setNotes] = useState("");
  const [shipping, setShipping] = useState(0);

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, price: 0 },
  ]);

  const taxRate = TAX_RATE_BY_TYPE[invoiceType];
  const vatNormalized = customerVat.replace(/\s/g, "").toUpperCase();
  const vatValid = vatNormalized.length > 0 && VAT_REGEX.test(vatNormalized);

  function addLineItem() {
    setLineItems([
      ...lineItems,
      { description: "", quantity: 1, price: 0 },
    ]);
  }

  function addDiscount() {
    setLineItems([
      ...lineItems,
      { description: "Rabatt", quantity: 1, price: 0 },
    ]);
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  function updateLineItem(
    index: number,
    field: keyof LineItem,
    value: string | number
  ) {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  }

  const subtotal = roundMoney(
    lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  const taxAmount = roundMoney((subtotal * taxRate) / 100);
  const total = roundMoney(subtotal + shipping + taxAmount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (invoiceType === "reverse_charge" && !vatValid) return;
    if (lineItems.length === 0) return;

    setSaving(true);
    const supabase = createClient();
    const invoiceNumber = `RE-MAN-${Date.now()}`;

    const { data, error } = await supabase
      .from("shopify_invoices")
      .insert({
        invoice_number: invoiceNumber,
        invoice_type: invoiceType,
        customer_name: customerCompany || customerName,
        customer_email: customerEmail || null,
        customer_vat: invoiceType === "reverse_charge" ? vatNormalized : null,
        customer_address:
          [customerAddress, customerCountry].filter(Boolean).join(", ") || null,
        notes: notes || null,
        line_items: lineItems.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          price: roundMoney(it.price),
        })),
        subtotal,
        shipping: roundMoney(shipping),
        tax_rate: taxRate,
        tax_amount: taxAmount,
        amount: total,
        currency: "EUR",
        is_manual: true,
        shopify_order_id: null,
        shopify_order_number: "Manuell",
      })
      .select("id")
      .single();

    setSaving(false);
    if (error || !data) {
      alert(
        "Fehler beim Speichern: " + (error?.message || "Unbekannter Fehler")
      );
    } else {
      router.push(`/invoices/${data.id}`);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/invoices"
        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        &larr; Zurück zu Rechnungen
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900">
        Neue Rechnung erstellen
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Manuelle Rechnung ohne Shopify-Bestellung
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        {/* Customer */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Kunde</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-500">
                Name *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">
                Firma
              </label>
              <input
                type="text"
                value={customerCompany}
                onChange={(e) => setCustomerCompany(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">
                Adresse
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Straße, PLZ Ort"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">
                Land
              </label>
              <input
                type="text"
                value={customerCountry}
                onChange={(e) => setCustomerCountry(e.target.value)}
                placeholder="z.B. Deutschland"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">
                E-Mail
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">
                USt-IdNr.{invoiceType === "reverse_charge" ? " *" : ""}
              </label>
              <input
                type="text"
                value={customerVat}
                onChange={(e) => setCustomerVat(e.target.value)}
                placeholder="z.B. ATU12345678"
                required={invoiceType === "reverse_charge"}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Invoice type */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-500">
              Rechnungstyp
            </label>
            <select
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            >
              <option value="standard">Standard (19% MwSt.)</option>
              <option value="reverse_charge">Reverse Charge (0%)</option>
              <option value="commercial">Commercial Invoice (0%)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">
              Versandkosten (EUR)
            </label>
            <input
              type="number"
              step={0.01}
              value={shipping}
              onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
        </div>

        {/* Line items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Positionen</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addLineItem}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                + Position
              </button>
              <button
                type="button"
                onClick={addDiscount}
                className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
              >
                + Rabatt
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Beschreibung
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 w-20">
                    Menge
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 w-28">
                    Einzelpreis
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 w-32">
                    Gesamt
                  </th>
                  <th className="px-4 py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {lineItems.map((item, i) => {
                  const lineTotal = item.quantity * item.price;
                  const isNegative = lineTotal < 0;
                  return (
                    <tr
                      key={i}
                      className={isNegative ? "bg-red-50/40" : undefined}
                    >
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(i, "description", e.target.value)
                          }
                          placeholder="Artikel / Dienstleistung"
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-gray-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          required
                          step={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(
                              i,
                              "quantity",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-right focus:border-gray-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          required
                          step={0.01}
                          value={item.price}
                          onChange={(e) =>
                            updateLineItem(
                              i,
                              "price",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className={`w-full rounded border px-2 py-1 text-sm text-right focus:outline-none ${
                            isNegative
                              ? "border-red-300 text-red-700 focus:border-red-500"
                              : "border-gray-200 focus:border-gray-400"
                          }`}
                        />
                      </td>
                      <td
                        className={`px-4 py-2 text-right text-sm font-medium ${
                          isNegative ? "text-red-700" : "text-gray-900"
                        }`}
                      >
                        {formatEUR(lineTotal)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineItem(i)}
                            className="text-red-400 hover:text-red-600 text-sm"
                          >
                            &#10005;
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 text-sm">
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-2 text-right font-medium text-gray-700"
                  >
                    Zwischensumme
                  </td>
                  <td className="px-4 py-2 text-right text-gray-900">
                    {formatEUR(subtotal)}
                  </td>
                  <td />
                </tr>
                {shipping !== 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-2 text-right font-medium text-gray-700"
                    >
                      Versand
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      {formatEUR(shipping)}
                    </td>
                    <td />
                  </tr>
                )}
                {taxRate > 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-2 text-right font-medium text-gray-700"
                    >
                      MwSt. ({taxRate}%)
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      {formatEUR(taxAmount)}
                    </td>
                    <td />
                  </tr>
                )}
                <tr className="border-t border-gray-300">
                  <td
                    colSpan={3}
                    className="px-4 py-2 text-right font-bold text-gray-900"
                  >
                    Gesamt
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-gray-900">
                    {formatEUR(total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-500">
            Notiz
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optionale Anmerkung zur Rechnung"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>

        <button
          type="submit"
          disabled={saving || (invoiceType === "reverse_charge" && !vatValid)}
          className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {saving ? "Wird erstellt..." : "Rechnung erstellen & PDF generieren"}
        </button>
      </form>
    </div>
  );
}
