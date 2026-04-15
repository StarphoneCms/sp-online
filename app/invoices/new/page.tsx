"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { type InvoiceType } from "@/lib/shopify";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  currency: string;
}

const VAT_REGEX =
  /^(AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|GR|HU|IE|IT|LV|LT|LU|MT|NL|PL|PT|RO|SK|SI|ES|SE)[A-Z0-9]{2,13}$/;

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
  const [note, setNote] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("14");
  const [currency, setCurrency] = useState("EUR");

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, currency: "EUR" },
  ]);

  const vatNormalized = customerVat.replace(/\s/g, "").toUpperCase();
  const vatValid = vatNormalized.length > 0 && VAT_REGEX.test(vatNormalized);

  function addLineItem() {
    setLineItems([
      ...lineItems,
      { description: "", quantity: 1, unitPrice: 0, currency },
    ]);
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  }

  const totalAmount = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

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
        shopify_order_id: "manual",
        shopify_order_number: "Manuell",
        invoice_number: invoiceNumber,
        invoice_type: invoiceType,
        customer_name: customerCompany || customerName,
        customer_email: customerEmail,
        customer_vat: invoiceType === "reverse_charge" ? vatNormalized : null,
        amount: totalAmount,
        currency,
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
              <label className="block text-xs font-medium text-gray-500">Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Firma</label>
              <input
                type="text"
                value={customerCompany}
                onChange={(e) => setCustomerCompany(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Adresse</label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Straße, PLZ Ort"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Land</label>
              <input
                type="text"
                value={customerCountry}
                onChange={(e) => setCustomerCountry(e.target.value)}
                placeholder="z.B. Deutschland"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">E-Mail</label>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-gray-500">Rechnungstyp</label>
            <select
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            >
              <option value="standard">Standard (19% MwSt.)</option>
              <option value="reverse_charge">Reverse Charge</option>
              <option value="commercial">Commercial Invoice</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">
              Zahlungsziel (Tage)
            </label>
            <input
              type="number"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              min={0}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Währung</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="CHF">CHF</option>
            </select>
          </div>
        </div>

        {/* Line items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Positionen</h2>
            <button
              type="button"
              onClick={addLineItem}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              + Position hinzufügen
            </button>
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
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 w-28">
                    Gesamt
                  </th>
                  <th className="px-4 py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {lineItems.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => updateLineItem(i, "description", e.target.value)}
                        placeholder="Artikel / Dienstleistung"
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-gray-400 focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        required
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateLineItem(i, "quantity", parseInt(e.target.value) || 0)}
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-right focus:border-gray-400 focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        required
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-right focus:border-gray-400 focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                      {(item.quantity * item.unitPrice).toFixed(2)} {currency}
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
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                    Gesamt
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                    {totalAmount.toFixed(2)} {currency}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-medium text-gray-500">Notiz</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
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
