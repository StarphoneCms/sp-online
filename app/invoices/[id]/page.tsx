import Link from "next/link";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerComponentClient();

  const { data: invoice, error } = await supabase
    .from("shopify_invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !invoice) {
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

  const typeLabels: Record<string, string> = {
    standard: "Standard",
    reverse_charge: "Reverse Charge",
    commercial: "Commercial Invoice",
  };
  const typeStyles: Record<string, string> = {
    standard: "bg-blue-100 text-blue-800",
    reverse_charge: "bg-purple-100 text-purple-800",
    commercial: "bg-orange-100 text-orange-800",
  };

  const mailtoSubject = encodeURIComponent(
    `Rechnung ${invoice.invoice_number} — Bestellung ${invoice.shopify_order_number}`
  );
  const mailtoBody = encodeURIComponent(
    `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie die Rechnung ${invoice.invoice_number} zu Ihrer Bestellung ${invoice.shopify_order_number}.\n\nMit freundlichen Grüßen\nAli Kaan Yilmaz e.K.\nStarphone`
  );
  const mailtoLink = `mailto:${invoice.customer_email || ""}?subject=${mailtoSubject}&body=${mailtoBody}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/invoices"
        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        &larr; Zurück zu Rechnungen
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {invoice.invoice_number}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Bestellung {invoice.shopify_order_number} &middot;{" "}
            {new Date(invoice.created_at).toLocaleDateString("de-DE")}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            typeStyles[invoice.invoice_type] || ""
          }`}
        >
          {typeLabels[invoice.invoice_type] || invoice.invoice_type}
        </span>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-medium text-gray-500">Kunde</h3>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {invoice.customer_name}
          </p>
          {invoice.customer_email && (
            <p className="text-sm text-gray-600">{invoice.customer_email}</p>
          )}
          {invoice.customer_vat && (
            <p className="mt-1 text-sm text-gray-600">
              USt-IdNr.: {invoice.customer_vat}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-medium text-gray-500">Betrag</h3>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {invoice.amount} {invoice.currency}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={`/api/invoices/${invoice.id}/pdf`}
          download={`${invoice.invoice_number}.pdf`}
          className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          PDF herunterladen
        </a>
        <a
          href={`/api/invoices/${invoice.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          PDF anzeigen
        </a>
        <a
          href={mailtoLink}
          className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Per E-Mail senden
        </a>
      </div>

      {invoice.invoice_type === "reverse_charge" && (
        <div className="mt-6 rounded-lg border border-purple-200 bg-purple-50 p-4">
          <p className="text-xs text-purple-800">
            Steuerschuldnerschaft des Leistungsempfängers gemäß §13b UStG
            (Reverse Charge). USt-IdNr. des Leistungsempfängers:{" "}
            {invoice.customer_vat}
          </p>
        </div>
      )}

      {invoice.invoice_type === "commercial" && (
        <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <p className="text-xs text-orange-800">
            Steuerfreie Ausfuhrlieferung gemäß §4 Nr. 1a UStG.
          </p>
        </div>
      )}
    </div>
  );
}
