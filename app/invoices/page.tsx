import Link from "next/link";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function InvoicesPage() {
  const supabase = await createServerComponentClient();

  const { data: invoices, error } = await supabase
    .from("shopify_invoices")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error.message}</p>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Rechnungsnr.
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Bestellung
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Kunde
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Typ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Betrag
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Datum
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {!invoices || invoices.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  Noch keine Rechnungen erstellt.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => {
                const typeLabels: Record<string, string> = {
                  standard: "Standard",
                  reverse_charge: "Reverse Charge",
                  commercial: "Commercial",
                };
                const typeStyles: Record<string, string> = {
                  standard: "bg-blue-100 text-blue-800",
                  reverse_charge: "bg-purple-100 text-purple-800",
                  commercial: "bg-orange-100 text-orange-800",
                };

                return (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="hover:underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {invoice.shopify_order_number}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {invoice.customer_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          typeStyles[invoice.invoice_type] || ""
                        }`}
                      >
                        {typeLabels[invoice.invoice_type] ||
                          invoice.invoice_type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {invoice.amount} {invoice.currency}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {new Date(invoice.created_at).toLocaleDateString("de-DE")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/invoices/${invoice.id}/pdf`}
                          download={`${invoice.invoice_number}.pdf`}
                          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 transition-colors"
                        >
                          PDF herunterladen
                        </a>
                        <a
                          href={`/api/invoices/${invoice.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Anzeigen
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
