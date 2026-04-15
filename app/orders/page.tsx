import Link from "next/link";
import {
  shopifyFetch,
  detectInvoiceType,
  type ShopifyOrder,
  type InvoiceType,
} from "@/lib/shopify";

function InvoiceTypeBadge({ type }: { type: InvoiceType }) {
  const styles: Record<InvoiceType, string> = {
    standard: "bg-blue-100 text-blue-800",
    reverse_charge: "bg-purple-100 text-purple-800",
    commercial: "bg-orange-100 text-orange-800",
  };
  const labels: Record<InvoiceType, string> = {
    standard: "Standard",
    reverse_charge: "Reverse Charge",
    commercial: "Commercial",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[type]}`}
    >
      {labels[type]}
    </span>
  );
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: filterType } = await searchParams;

  let orders: ShopifyOrder[] = [];
  let error: string | null = null;

  try {
    const data = await shopifyFetch("orders.json?status=any&limit=50");
    orders = data.orders || [];
  } catch (e) {
    error = e instanceof Error ? e.message : "Fehler beim Laden der Bestellungen";
  }

  const filteredOrders = filterType
    ? orders.filter((o) => detectInvoiceType(o) === filterType)
    : orders;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bestellungen</h1>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href="/orders"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            !filterType
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Alle
        </Link>
        <Link
          href="/orders?type=standard"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            filterType === "standard"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Standard
        </Link>
        <Link
          href="/orders?type=reverse_charge"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            filterType === "reverse_charge"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Reverse Charge
        </Link>
        <Link
          href="/orders?type=commercial"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            filterType === "commercial"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Commercial
        </Link>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Bestellung
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Kunde
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Betrag
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Land
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Rechnungstyp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Datum
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredOrders.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  Keine Bestellungen gefunden.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const invoiceType = detectInvoiceType(order);
                const country =
                  order.billing_address?.country ||
                  order.shipping_address?.country ||
                  "—";
                const customerName =
                  order.billing_address?.name ||
                  (order.customer
                    ? `${order.customer.first_name} ${order.customer.last_name}`
                    : "—");

                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {order.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {customerName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {order.total_price} {order.currency}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {country}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <InvoiceTypeBadge type={invoiceType} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString("de-DE")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <Link
                        href={`/orders/${order.id}`}
                        className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 transition-colors"
                      >
                        Rechnung erstellen
                      </Link>
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
