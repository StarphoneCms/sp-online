"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { type InvoiceType } from "@/lib/shopify";
import { formatMoney, roundMoney } from "@/lib/format";

interface LineItem {
  description: string;
  quantity: number;
  price: number;
}

const VAT_REGEX =
  /^(AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|GR|HU|IE|IT|LV|LT|LU|MT|NL|PL|PT|RO|SK|SI|ES|SE)[A-Z0-9]{2,13}$/;

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("standard");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerVat, setCustomerVat] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [shipping, setShipping] = useState(0);
  const [taxRate, setTaxRate] = useState(19);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [currency, setCurrency] = useState("EUR");
  const [isManual, setIsManual] = useState(false);

  const vatNormalized = customerVat.replace(/\s/g, "").toUpperCase();
  const vatValid = vatNormalized.length > 0 && VAT_REGEX.test(vatNormalized);

  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const descRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (focusIndex == null) return;
    const el = descRefs.current[focusIndex];
    if (el) {
      el.focus();
      el.select();
    }
    setFocusIndex(null);
  }, [focusIndex, lineItems.length]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("shopify_invoices")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setInvoiceNumber(data.invoice_number || "");
      setInvoiceType(data.invoice_type || "standard");
      setCustomerName(data.customer_name || "");
      setCustomerEmail(data.customer_email || "");
      setCustomerVat(data.customer_vat || "");
      setCustomerAddress(data.customer_address || "");
      setNotes(data.notes || "");
      setShipping(parseFloat(data.shipping) || 0);
      setCurrency(data.currency || "EUR");
      setIsManual(!!data.is_manual);
      setTaxRate(
        data.tax_rate != null
          ? parseFloat(data.tax_rate)
          : data.invoice_type === "standard"
            ? 19
            : 0
      );
      const items: LineItem[] = Array.isArray(data.line_items)
        ? data.line_items.map((it: { description?: string; quantity?: number; price?: number }) => ({
            description: it.description || "",
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
          }))
        : [];
      setLineItems(items);
      setLoading(false);
    }
    load();
  }, [id]);

  function addLineItem() {
    setLineItems([...lineItems, { description: "", quantity: 1, price: 0 }]);
  }

  function addDiscount() {
    // "Rabatt" is a suggested default only — the user can rename the row
    // to whatever fits ("Treuebonus Stammkunde", "10% Mengenrabatt", …).
    const next = [...lineItems, { description: "Rabatt", quantity: 1, price: 0 }];
    setLineItems(next);
    setFocusIndex(next.length - 1);
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

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("shopify_invoices")
      .update({
        invoice_type: invoiceType,
        customer_name: customerName,
        customer_email: customerEmail || null,
        customer_vat: invoiceType === "reverse_charge" ? vatNormalized : null,
        customer_address: customerAddress || null,
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
        // Only manual invoices can change their currency. Shopify-import
        // currency is locked to the order's presentment currency.
        ...(isManual ? { currency } : {}),
      })
      .eq("id", id);

    setSaving(false);
    if (error) {
      alert("Fehler beim Speichern: " + error.message);
    } else {
      router.push(`/invoices/${id}`);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <p className="text-sm text-gray-500">Laden...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">Rechnung nicht gefunden.</p>
        </div>
        <Link
          href="/invoices"
          className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900"
        >
          Zurück zu Rechnungen
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href={`/invoices/${id}`}
        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        &larr; Zurück zur Rechnung
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900">
        Rechnung bearbeiten
      </h1>
      <p className="mt-1 text-sm text-gray-500">{invoiceNumber}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-gray-500">
              Rechnungsnr.
            </label>
            <input
              type="text"
              value={invoiceNumber}
              readOnly
              className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">
              Rechnungstyp
            </label>
            <select
              value={invoiceType}
              onChange={(e) => {
                const newType = e.target.value as InvoiceType;
                setInvoiceType(newType);
                setTaxRate(newType === "standard" ? 19 : 0);
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            >
              <option value="standard">Standard (19% MwSt.)</option>
              <option value="reverse_charge">Reverse Charge (0%)</option>
              <option value="commercial">Commercial Invoice (0%)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">
              Währung
            </label>
            {isManual ? (
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CHF">CHF</option>
                <option value="CAD">CAD</option>
                <option value="SEK">SEK</option>
                <option value="NOK">NOK</option>
                <option value="DKK">DKK</option>
              </select>
            ) : (
              <div className="mt-1 flex h-[38px] items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700">
                {currency}
                <span className="ml-2 text-xs text-gray-400">
                  (Bestellwährung)
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-500">
              Kundenname *
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
              E-Mail
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500">
            Adresse
          </label>
          <textarea
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            rows={2}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>

        {invoiceType === "reverse_charge" && (
          <div>
            <label className="block text-xs font-medium text-gray-500">
              USt-IdNr. *
            </label>
            <input
              type="text"
              required
              value={customerVat}
              onChange={(e) => setCustomerVat(e.target.value)}
              placeholder="z.B. ATU12345678"
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                vatValid
                  ? "border-green-400 focus:border-green-500 focus:ring-green-500"
                  : customerVat.length > 0
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-gray-500 focus:ring-gray-500"
              }`}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-500">
            Versandkosten ({currency})
          </label>
          <input
            type="number"
            step={0.01}
            value={shipping}
            onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
            className="mt-1 block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
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
                {lineItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-sm text-gray-400"
                    >
                      Keine Positionen — füge eine hinzu
                    </td>
                  </tr>
                ) : (
                  lineItems.map((item, i) => {
                    const lineTotal = item.quantity * item.price;
                    const isNeg = lineTotal < 0;
                    return (
                      <tr
                        key={i}
                        className={isNeg ? "bg-red-50/40" : undefined}
                      >
                        <td className="px-4 py-2">
                          <input
                            ref={(el) => {
                              descRefs.current[i] = el;
                            }}
                            type="text"
                            required
                            value={item.description}
                            onChange={(e) =>
                              updateLineItem(i, "description", e.target.value)
                            }
                            onFocus={(e) => e.currentTarget.select()}
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
                              isNeg
                                ? "border-red-300 text-red-700 focus:border-red-500"
                                : "border-gray-200 focus:border-gray-400"
                            }`}
                          />
                        </td>
                        <td
                          className={`px-4 py-2 text-right text-sm font-medium ${
                            isNeg ? "text-red-700" : "text-gray-900"
                          }`}
                        >
                          {formatMoney(lineTotal, currency)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLineItem(i)}
                            className="text-red-400 hover:text-red-600 text-sm"
                          >
                            &#10005;
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
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
                    {formatMoney(subtotal, currency)}
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
                      {formatMoney(shipping, currency)}
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
                      {formatMoney(taxAmount, currency)}
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
                    {formatMoney(total, currency)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500">
            Notiz
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || (invoiceType === "reverse_charge" && !vatValid)}
            className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Wird gespeichert..." : "Speichern"}
          </button>
          <Link
            href={`/invoices/${id}`}
            className="rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
