import Link from "next/link";
import { createServerComponentClient } from "@/lib/supabase/server";
import { shopifyFetch, type ShopifyOrder } from "@/lib/shopify";
import { formatEUR } from "@/lib/format";
import SendEmailButton from "./SendEmailButton";

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

interface SavedLineItem {
  description: string;
  quantity: number;
  price: number;
}

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

  const savedLineItems: SavedLineItem[] = Array.isArray(invoice.line_items)
    ? invoice.line_items
    : [];
  const hasSavedLineItems = savedLineItems.length > 0;

  let order: ShopifyOrder | null = null;
  if (!invoice.is_manual && invoice.shopify_order_id) {
    try {
      const data = await shopifyFetch(
        `orders/${invoice.shopify_order_id}.json`
      );
      order = data.order;
    } catch {
      // Order may no longer exist
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

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {invoice.invoice_number}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {invoice.is_manual
              ? "Manuelle Rechnung"
              : `Bestellung ${invoice.shopify_order_number}`}{" "}
            &middot;{" "}
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

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={`/api/invoices/${invoice.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          PDF öffnen
        </a>
        <SendEmailButton
          invoiceId={invoice.id}
          customerEmail={invoice.customer_email}
        />
        <Link
          href={`/invoices/${invoice.id}/edit`}
          className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Bearbeiten
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Kunde
          </h3>
          <p className="mt-3 text-sm font-medium text-gray-900">
            {invoice.customer_name}
          </p>
          {invoice.customer_email && (
            <p className="mt-0.5 text-sm text-gray-500">
              {invoice.customer_email}
            </p>
          )}
          {invoice.customer_vat && (
            <p className="mt-2 text-sm text-gray-600">
              USt-IdNr.: {invoice.customer_vat}
            </p>
          )}
          {invoice.customer_address && (
            <p className="mt-3 text-sm text-gray-500 leading-relaxed whitespace-pre-line">
              {invoice.customer_address}
            </p>
          )}
          {!invoice.customer_address && order?.billing_address && (
            <div className="mt-3 text-sm text-gray-500 leading-relaxed">
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
            </div>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Betrag
          </h3>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {formatEUR(invoice.amount)}
          </p>
          <div className="mt-4 space-y-1 text-sm text-gray-500">
            {invoice.subtotal != null && (
              <div className="flex justify-between">
                <span>Zwischensumme</span>
                <span className="font-medium text-gray-700">
                  {formatEUR(invoice.subtotal)}
                </span>
              </div>
            )}
            {invoice.shipping != null && parseFloat(invoice.shipping) !== 0 && (
              <div className="flex justify-between">
                <span>Versand</span>
                <span className="font-medium text-gray-700">
                  {formatEUR(invoice.shipping)}
                </span>
              </div>
            )}
            {invoice.tax_amount != null && parseFloat(invoice.tax_amount) !== 0 && (
              <div className="flex justify-between">
                <span>MwSt. ({invoice.tax_rate ?? 0}%)</span>
                <span className="font-medium text-gray-700">
                  {formatEUR(invoice.tax_amount)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Rechnungstyp</span>
              <span className="font-medium text-gray-700">
                {typeLabels[invoice.invoice_type] || invoice.invoice_type}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Erstellt am</span>
              <span className="font-medium text-gray-700">
                {new Date(invoice.created_at).toLocaleDateString("de-DE")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {hasSavedLineItems && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Positionen
          </h3>
          <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Beschreibung
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Menge
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Einzelpreis
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Gesamt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {savedLineItems.map((item, idx) => {
                  const lineTotal = item.quantity * item.price;
                  const isNeg = lineTotal < 0;
                  return (
                    <tr key={idx} className={isNeg ? "bg-red-50/40" : undefined}>
                      <td
                        className={`px-5 py-3 text-sm ${
                          isNeg ? "text-red-700" : "text-gray-900"
                        }`}
                      >
                        {item.description}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-600">
                        {item.quantity}
                      </td>
                      <td
                        className={`px-5 py-3 text-right text-sm ${
                          isNeg ? "text-red-700" : "text-gray-600"
                        }`}
                      >
                        {formatEUR(item.price)}
                      </td>
                      <td
                        className={`px-5 py-3 text-right text-sm font-medium ${
                          isNeg ? "text-red-700" : "text-gray-900"
                        }`}
                      >
                        {formatEUR(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 text-sm">
                {invoice.subtotal != null && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-3 text-right font-medium text-gray-700"
                    >
                      Zwischensumme
                    </td>
                    <td className="px-5 py-3 text-right text-gray-900">
                      {formatEUR(invoice.subtotal)}
                    </td>
                  </tr>
                )}
                {invoice.shipping != null &&
                  parseFloat(invoice.shipping) !== 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-5 py-3 text-right font-medium text-gray-700"
                      >
                        Versand
                      </td>
                      <td className="px-5 py-3 text-right text-gray-900">
                        {formatEUR(invoice.shipping)}
                      </td>
                    </tr>
                  )}
                {invoice.tax_amount != null &&
                  parseFloat(invoice.tax_amount) !== 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-5 py-3 text-right font-medium text-gray-700"
                      >
                        MwSt. ({invoice.tax_rate ?? 0}%)
                      </td>
                      <td className="px-5 py-3 text-right text-gray-900">
                        {formatEUR(invoice.tax_amount)}
                      </td>
                    </tr>
                  )}
                <tr className="border-t border-gray-300">
                  <td
                    colSpan={3}
                    className="px-5 py-3 text-right font-bold text-gray-900"
                  >
                    Gesamt
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900">
                    {formatEUR(invoice.amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {!hasSavedLineItems && order && order.line_items.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Positionen
          </h3>
          <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Artikel
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    SKU
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Menge
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Einzelpreis
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Gesamt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {order.line_items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3 text-sm text-gray-900">
                      {item.title}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {item.sku || "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-600">
                      {item.quantity}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-600">
                      {formatEUR(item.price)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-gray-900">
                      {formatEUR(item.quantity * parseFloat(item.price))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-3 text-right text-sm font-medium text-gray-700"
                  >
                    Gesamtbetrag
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-gray-900">
                    {formatEUR(order.total_price)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {invoice.notes && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Notiz
          </h4>
          <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">
            {invoice.notes}
          </p>
        </div>
      )}

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
