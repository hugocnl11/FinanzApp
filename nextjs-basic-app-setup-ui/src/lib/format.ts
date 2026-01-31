const DEFAULT_LOCALE = "es-ES";

const defaultNumberFormatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
  maximumFractionDigits: 0,
});

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  if (!options) {
    return defaultNumberFormatter.format(value);
  }
  return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(value);
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
};

/** Formatea un importe con el símbolo de la moneda (multi-moneda en UI) */
export function formatCurrency(
  value: number,
  currency: string = "EUR",
  options?: Intl.NumberFormatOptions
): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency + " ";
  const formatted = new Intl.NumberFormat(DEFAULT_LOCALE, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    ...options,
  }).format(value);
  return currency === "USD" ? symbol + formatted : formatted + " " + symbol;
}
