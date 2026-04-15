import Link from "next/link";
import { getShopifyToken } from "@/lib/shopify";

export default async function DashboardPage() {
  const token = await getShopifyToken();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900">
        SP Online — Shopify Rechnungstool
      </h1>
      <p className="mt-2 text-gray-600">
        Rechnungen erstellen und verwalten für Shopify-Bestellungen.
      </p>

      {!token && (
        <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <h2 className="text-lg font-semibold text-yellow-800">
            Shopify nicht verbunden
          </h2>
          <p className="mt-1 text-sm text-yellow-700">
            Verbinde deinen Shopify-Shop, um Bestellungen abzurufen und
            Rechnungen zu erstellen.
          </p>
          <Link
            href="/api/shopify/install"
            className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Mit Shopify verbinden
          </Link>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Bestellungen gesamt
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">—</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Rechnungen erstellt
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">—</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Offene Bestellungen
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">—</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-4">
          <Link
            href="/orders"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Bestellungen anzeigen
          </Link>
          <Link
            href="/invoices"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Rechnungen anzeigen
          </Link>
        </div>
      </div>
    </div>
  );
}
