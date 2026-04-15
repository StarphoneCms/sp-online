"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InvoiceActions({
  invoiceId,
  invoiceNumber,
}: {
  invoiceId: string;
  invoiceNumber: string;
}) {
  const router = useRouter();

  async function handleDelete() {
    const confirmed = window.confirm(
      `Rechnung ${invoiceNumber} wirklich löschen?`
    );
    if (!confirmed) return;

    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      router.refresh();
    } else {
      alert("Fehler beim Löschen der Rechnung.");
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <a
        href={`/api/invoices/${invoiceId}/pdf`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-800 transition-colors"
      >
        PDF
      </a>
      <Link
        href={`/invoices/${invoiceId}/edit`}
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
        title="Bearbeiten"
      >
        &#9998;
      </Link>
      <button
        onClick={handleDelete}
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
        title="Löschen"
      >
        &#128465;
      </button>
    </div>
  );
}
