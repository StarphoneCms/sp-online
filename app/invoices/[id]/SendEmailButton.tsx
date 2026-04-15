"use client";

import { useState } from "react";

export default function SendEmailButton({
  invoiceId,
  customerEmail,
}: {
  invoiceId: string;
  customerEmail: string | null;
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!customerEmail) {
      setError("Keine E-Mail-Adresse vorhanden.");
      return;
    }

    const confirmed = window.confirm(
      `Rechnung per E-Mail an ${customerEmail} senden?`
    );
    if (!confirmed) return;

    setSending(true);
    setError(null);

    const res = await fetch(`/api/invoices/${invoiceId}/send-email`, {
      method: "POST",
    });

    setSending(false);

    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Fehler beim Senden der E-Mail.");
    }
  }

  if (sent) {
    return (
      <span className="rounded-md border border-green-300 bg-green-50 px-5 py-2.5 text-sm font-medium text-green-700">
        E-Mail gesendet
      </span>
    );
  }

  return (
    <>
      <button
        onClick={handleSend}
        disabled={sending || !customerEmail}
        className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {sending ? "Wird gesendet..." : "E-Mail senden"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </>
  );
}
