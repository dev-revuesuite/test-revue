// Local-currency DISPLAY of prices (no imports: used in the browser and on the server).
//
// Everyone is charged in Indian rupees. For visitors outside India the pricing
// screens also show roughly what that is in their own currency, as a guide.
// Nothing here affects what is charged: the amount comes from the Razorpay plan
// (subscriptions) or the server's add-on catalog, both in INR.
//
// The rates are a fixed table, not a live feed: the local price is labelled
// "about", so a small drift is fine, and nothing outside our control can break
// the pricing screens. Update INR_PER_UNIT (and RATES_AS_OF) every few months.

export const DISPLAY_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD"] as const
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number]

/** Rupees for one unit of each currency (approximate mid-market rates). */
export const INR_PER_UNIT: Record<DisplayCurrency, number> = {
  INR: 1,
  USD: 94,
  EUR: 105,
  GBP: 126,
  AED: 25.6,
  SGD: 73,
  AUD: 65,
  CAD: 67,
}

/** When the rates above were last set (shown nowhere; for whoever updates them). */
export const RATES_AS_OF = "2026-11-21"

export const CURRENCY_NAMES: Record<DisplayCurrency, string> = {
  INR: "Indian rupee (₹)",
  USD: "US dollar ($)",
  EUR: "Euro (€)",
  GBP: "British pound (£)",
  AED: "UAE dirham (AED)",
  SGD: "Singapore dollar (S$)",
  AUD: "Australian dollar (A$)",
  CAD: "Canadian dollar (CA$)",
}

// Countries that use the euro.
const EURO_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK",
  "SI", "ES",
])

const COUNTRY_CURRENCY: Record<string, DisplayCurrency> = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  AE: "AED",
  SG: "SGD",
  AU: "AUD",
  CA: "CAD",
}

export function parseDisplayCurrency(value: unknown): DisplayCurrency | null {
  if (typeof value !== "string") return null
  const upper = value.trim().toUpperCase()
  return (DISPLAY_CURRENCIES as readonly string[]).includes(upper) ? (upper as DisplayCurrency) : null
}

/**
 * The currency to show for a two-letter country code. Unknown or missing
 * country (local development, no location) = rupees, i.e. no change. A known
 * country we have no currency for = US dollars.
 */
export function currencyForCountry(country: string | null | undefined): DisplayCurrency {
  const code = typeof country === "string" ? country.trim().toUpperCase() : ""
  if (!/^[A-Z]{2}$/.test(code)) return "INR"
  if (COUNTRY_CURRENCY[code]) return COUNTRY_CURRENCY[code]
  if (EURO_COUNTRIES.has(code)) return "EUR"
  return "USD"
}

/** Browser time zones that mean "in India", whatever the network says (VPNs, proxies). */
export function isIndianTimeZone(timeZone: string | null | undefined): boolean {
  return timeZone === "Asia/Kolkata" || timeZone === "Asia/Calcutta"
}

/**
 * A rupee amount in another currency, rounded to a whole unit (a guide price
 * doesn't need cents). Never rounds a real price down to 0.
 */
export function convertFromInr(amountInr: number, currency: DisplayCurrency): number {
  if (!Number.isFinite(amountInr) || amountInr <= 0) return 0
  if (currency === "INR") return amountInr
  return Math.max(1, Math.round(amountInr / INR_PER_UNIT[currency]))
}

export function formatInr(amountInr: number): string {
  return `₹${amountInr.toLocaleString("en-IN")}`
}

/**
 * What goes in front of an amount. Our own table, not Intl: browsers disagree
 * (and print "SGD 34" for Singapore dollars), and the landing page must format
 * exactly like the app.
 */
export const CURRENCY_PREFIX: Record<DisplayCurrency, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED ",
  SGD: "S$",
  AUD: "A$",
  CAD: "CA$",
}

/** "$27", "€24", "S$34", "A$38", "AED 98" (whole units). */
export function formatCurrencyAmount(amount: number, currency: DisplayCurrency): string {
  if (currency === "INR") return formatInr(amount)
  return `${CURRENCY_PREFIX[currency]}${Math.round(amount).toLocaleString("en-US")}`
}

export type LocalPrice = {
  /** What to show as the price: "₹2,499" in India, "$27" elsewhere. */
  main: string
  /** The rupee amount that is actually charged, when `main` is a guide price; null in India. */
  chargedInr: string | null
}

/**
 * "Save X a year" for annual vs 12 × monthly, in the display currency, or null
 * when there is no saving. Outside India it is worked out from the ROUNDED
 * prices on screen, so it always matches them (12 × $27 − $266 = $58, not the
 * $53 that converting the rupee saving would give).
 */
export function localAnnualSaving(monthlyInr: number, annualInr: number, currency: DisplayCurrency): string | null {
  const saving =
    currency === "INR"
      ? monthlyInr * 12 - annualInr
      : convertFromInr(monthlyInr, currency) * 12 - convertFromInr(annualInr, currency)
  return saving > 0 ? formatCurrencyAmount(saving, currency) : null
}

/** How to show a rupee price to someone who thinks in `currency`. */
export function localPrice(amountInr: number, currency: DisplayCurrency): LocalPrice {
  if (currency === "INR") return { main: formatInr(amountInr), chargedInr: null }
  return {
    main: formatCurrencyAmount(convertFromInr(amountInr, currency), currency),
    chargedInr: formatInr(amountInr),
  }
}
