"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { type InvoiceType } from "@/lib/shopify";

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
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState("EUR");

  const vatNormalized = customerVat.replace(/\s/g, "").toUpperCase();
  const vatValid = vatNormalized.length > 0 && VAT_REGEX.test(vatNormalized);

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
      setAmount(parseFloat(data.amount) || 0);
      setCurrency(data.currency || "EUR");
      setLoading(false);
    }
    load();
  }, [id]);

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
        customer_email: customerEmail,
        customer_vat: invoiceType === "reverse_charge" ? vatNormalized : null,
        amount,
        currency,
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

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            >
              <option value="standard">Standard (19% MwSt.)</option>
              <option value="reverse_charge">Reverse Charge</option>
              <option value="commercial">Commercial Invoice</option>
            </select>
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-500">
              Betrag *
            </label>
            <input
              type="number"
              required
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">
              Währung
            </label>
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
