import Link from "next/link";
import {
  shopifyFetch,
  fetchCustomerTaxNumber,
  detectInvoiceType,
  getPresentmentAmount,
  getPresentmentCurrency,
  type ShopifyOrder,
  type InvoiceType,
} from "@/lib/shopify";
import { formatMoney } from "@/lib/format";

function InvoiceTypeBadge({ type }: { type: InvoiceType }) {
  const styles: Record<InvoiceType, string> = {
    standard: "bg-blue-100 text-blue-800",
    reverse_charge: "bg-purple-100 text-purple-800",
    commercial: "bg-orange-100 text-orange-800",
  };
  const labels: Record<InvoiceType, string> = {
    standard: "Standard",
    reverse_charge: "RC",
    commercial: "Export",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[type]}`}
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
    error =
      e instanceof Error ? e.message : "Fehler beim Laden der Bestellungen";
  }

  const taxNumberMap = new Map<number, string | null>();
  if (orders.length > 0) {
    const customerIds = [
      ...new Set(
        orders
          .map((o) => o.customer?.id)
          .filter((id): id is number => id !== undefined)
      ),
    ];
    const results = await Promise.all(
      customerIds.map(async (cid) => {
        const taxNum = await fetchCustomerTaxNumber(cid);
        return [cid, taxNum] as const;
      })
    );
    for (const [cid, taxNum] of results) {
      taxNumberMap.set(cid, taxNum);
    }
  }

  const filteredOrders = filterType
    ? orders.filter((o) => {
        const taxNum = o.customer?.id
          ? taxNumberMap.get(o.customer.id) ?? null
          : null;
        return detectInvoiceType(o, taxNum) === filterType;
      })
    : orders;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Bestellungen</h1>
      </div>

      <div className="mt-3 flex gap-1.5">
        {([
          [undefined, "Alle"],
          ["standard", "Standard"],
          ["reverse_charge", "Reverse Charge"],
          ["commercial", "Commercial"],
        ] as const).map(([val, label]) => (
          <Link
            key={label}
            href={val ? `/orders?type=${val}` : "/orders"}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              filterType === val || (!filterType && !val)
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-[10%] px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Nr.
              </th>
              <th className="w-[22%] px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Kunde
              </th>
              <th className="w-[14%] px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Betrag
              </th>
              <th className="w-[10%] px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Land
              </th>
              <th className="w-[12%] px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Typ
              </th>
              <th className="w-[14%] px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Datum
              </th>
              <th className="w-[18%] px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredOrders.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-sm text-gray-500"
                >
                  Keine Bestellungen gefunden.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const taxNumber = order.customer?.id
                  ? taxNumberMap.get(order.customer.id) ?? null
                  : null;
                const invoiceType = detectInvoiceType(order, taxNumber);
                const country =
                  order.billing_address?.country_code ||
                  order.shipping_address?.country_code ||
                  "\u2014";
                const customerName =
                  order.billing_address?.name ||
                  (order.customer
                    ? `${order.customer.first_name} ${order.customer.last_name}`
                    : "\u2014");

                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm font-medium text-gray-900">
                      {order.name}
                    </td>
                    <td className="truncate px-3 py-2.5 text-sm text-gray-600">
                      {customerName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-gray-600">
                      {formatMoney(
                        getPresentmentAmount(order.total_price_set, order.total_price),
                        getPresentmentCurrency(order)
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-gray-600">
                      {country}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm">
                      <InvoiceTypeBadge type={invoiceType} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString("de-DE")}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-sm">
                      <Link
                        href={`/orders/${order.id}`}
                        className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-800 transition-colors"
                      >
                        Rechnung +
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
