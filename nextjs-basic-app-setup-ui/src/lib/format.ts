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
