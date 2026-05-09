export function getString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export function getOptionalString(formData: FormData, key: string): string | null {
  const value = getString(formData, key);
  return value.length > 0 ? value : null;
}

export function parseCurrencyInputToCents(value: string, options?: { allowNegative?: boolean }) {
  const normalized = value.replace(/[$,\s]/g, "");
  const number = Number(normalized);

  if (!Number.isFinite(number)) {
    throw new Error("Please enter a valid money amount.");
  }

  if (!options?.allowNegative && number < 0) {
    throw new Error("Money values must be zero or greater.");
  }

  return Math.round(number * 100);
}

export function parseDateInput(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Please enter a valid date.");
  }

  return date;
}
