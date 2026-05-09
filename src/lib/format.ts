const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

export function formatCompactCents(cents: number): string {
  return compactCurrencyFormatter.format(cents / 100);
}

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}
