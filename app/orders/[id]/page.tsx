import Link from "next/link";
import { shopifyFetch, fetchCustomerTaxNumber, detectInvoiceType } from "@/lib/shopify";
import InvoiceForm from "./InvoiceForm";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let order;
  let error: string | null = null;
  let taxNumber: string | null = null;

  try {
    const data = await shopifyFetch(`orders/${id}.json`);
    order = data.order;
  } catch (e) {
    error =
      e instanceof Error ? e.message : "Fehler beim Laden der Bestellung";
  }

  if (order?.customer?.id) {
    taxNumber = await fetchCustomerTaxNumber(order.customer.id);
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">
            {error || "Bestellung nicht gefunden"}
          </p>
        </div>
        <Link
          href="/orders"
          className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900"
        >
          Zurück zu Bestellungen
        </Link>
      </div>
    );
  }

  const invoiceType = detectInvoiceType(order, taxNumber);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/orders"
        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        &larr; Zurück zu Bestellungen
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900">
        Rechnung erstellen — {order.name}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {new Date(order.created_at).toLocaleDateString("de-DE")} &middot;{" "}
        {order.total_price} {order.currency}
      </p>

      <div className="mt-8">
        <InvoiceForm
          order={order}
          detectedType={invoiceType}
          shopifyTaxNumber={taxNumber}
        />
      </div>
    </div>
  );
}
