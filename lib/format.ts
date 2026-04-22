export function formatMoney(
  value: number | string | null | undefined,
  currency: string | null | undefined = "EUR"
): string {
  const cur = (currency && currency.trim()) || "EUR";
  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (isNaN(n)) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(0);
  }
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    // Unknown currency code — fall back to plain "1.234,56 XYZ"
    return `${n.toFixed(2).replace(".", ",")} ${cur}`;
  }
}

/** Backwards-compat wrapper — prefer formatMoney(value, currency). */
export function formatEUR(value: number | string | null | undefined): string {
  return formatMoney(value, "EUR");
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
