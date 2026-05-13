/**
 * Money formatting helpers.
 *
 * Books and book_orders store amounts as INTEGER centavos
 * (PHP × 100). The existing formatPrice() in subscriptionService takes
 * whole pesos already; this util is for centavos-stored fields.
 */

import config from '@/config'

const currency = config.subscription.currency // '₱' by default

/** Format an integer-centavos amount as a localised PHP string (₱1,234.50). */
export function formatPHP(centavos: number): string {
  const pesos = (centavos ?? 0) / 100
  return `${currency}${pesos.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/** Convert a centavos amount to a plain decimal string (e.g. for form inputs). */
export function centavosToDecimal(centavos: number): string {
  return ((centavos ?? 0) / 100).toFixed(2)
}

/** Convert a decimal string back to centavos (Number-rounded). Returns NaN on bad input. */
export function decimalToCentavos(decimal: string | number): number {
  const n = Number(decimal)
  if (!Number.isFinite(n)) return Number.NaN
  return Math.round(n * 100)
}
