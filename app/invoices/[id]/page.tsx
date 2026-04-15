import Link from "next/link";
import { createServerComponentClient } from "@/lib/supabase/server";
import { shopifyFetch, type ShopifyOrder } from "@/lib/shopify";
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

  let order: ShopifyOrder | null = null;
  try {
    const data = await shopifyFetch(`orders/${invoice.shopify_order_id}.json`);
    order = data.order;
  } catch {
    // Order may no longer exist
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
          {order?.billing_address && (
            <div className="mt-3 text-sm text-gray-500 leading-relaxed">
              {order.billing_address.company && (
                <>{order.billing_address.company}<br /></>
              )}
              {order.billing_address.address1}
              {order.billing_address.address2 && (
                <><br />{order.billing_address.address2}</>
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
            {invoice.amount} {invoice.currency}
          </p>
          <div className="mt-4 space-y-1 text-sm text-gray-500">
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

      {order && order.line_items.length > 0 && (
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
                      {item.sku || "\u2014"}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-600">
                      {item.quantity}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-600">
                      {item.price} {order.currency}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-gray-900">
                      {(item.quantity * parseFloat(item.price)).toFixed(2)}{" "}
                      {order.currency}
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
                    {order.total_price} {order.currency}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
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
