import Link from "next/link";
import { createServerComponentClient } from "@/lib/supabase/server";

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

export default async function InvoicesPage() {
  const supabase = await createServerComponentClient();

  const { data: invoices, error } = await supabase
    .from("shopify_invoices")
    .select("*")
    .order("created_at", { ascending: false });

  const list = invoices || [];
  const totalCount = list.length;
  const standardCount = list.filter((i) => i.invoice_type === "standard").length;
  const reverseChargeCount = list.filter((i) => i.invoice_type === "reverse_charge").length;
  const commercialCount = list.filter((i) => i.invoice_type === "commercial").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>
        <Link
          href="/orders"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Neue Rechnung
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Gesamt
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalCount}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">
            Standard
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-900">
            {standardCount}
          </p>
        </div>
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 shadow-sm">
          <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">
            Reverse Charge
          </p>
          <p className="mt-1 text-2xl font-bold text-purple-900">
            {reverseChargeCount}
          </p>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 shadow-sm">
          <p className="text-xs font-medium text-orange-600 uppercase tracking-wider">
            Commercial
          </p>
          <p className="mt-1 text-2xl font-bold text-orange-900">
            {commercialCount}
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error.message}</p>
        </div>
      )}

      {list.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-16">
          <p className="text-lg font-medium text-gray-500">
            Noch keine Rechnungen erstellt
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Erstelle deine erste Rechnung aus einer Shopify-Bestellung.
          </p>
          <Link
            href="/orders"
            className="mt-6 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Zu den Bestellungen
          </Link>
        </div>
      ) : (
        <div className="mt-6 w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Rechnungsnr.
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Bestellung
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Kunde
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Typ
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Betrag
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Datum
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {list.map((invoice) => (
                <tr key={invoice.id} className="group hover:bg-gray-50">
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
                  <td className="px-6 py-4 text-sm">
                    <div className="text-gray-900">{invoice.customer_name}</div>
                    {invoice.customer_email && (
                      <div className="text-xs text-gray-400">
                        {invoice.customer_email}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        typeStyles[invoice.invoice_type] || ""
                      }`}
                    >
                      {typeLabels[invoice.invoice_type] || invoice.invoice_type}
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
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 transition-colors"
                      >
                        PDF herunterladen
                      </a>
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Details
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
