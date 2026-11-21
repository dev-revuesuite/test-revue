import {
  CURRENCY_PREFIX,
  currencyForCountry,
  INR_PER_UNIT,
  parseDisplayCurrency,
  RATES_AS_OF,
} from "@/lib/billing/display-currency"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Which currency to SHOW prices in for this visitor (display only; everyone is
 * charged in INR). Public and harmless: it returns the visitor's own country
 * (from Vercel's location header) and a rate from our fixed table.
 *
 * GET /api/geo            -> { country, currency, prefix, inrPerUnit, asOf }
 * GET /api/geo?currency=USD  previews another currency (testing; the landing
 *                            page also passes on a currency the visitor chose
 *                            in the app)
 *
 * Used by the landing site's pricing pages, which are static and can't read
 * the location themselves. No location (local development) = INR.
 */
export async function GET(request: Request) {
  const header = request.headers.get("x-vercel-ip-country")?.trim().toUpperCase() ?? ""
  const country = /^[A-Z]{2}$/.test(header) ? header : null
  const requested = parseDisplayCurrency(new URL(request.url).searchParams.get("currency"))
  const currency = requested ?? currencyForCountry(country)

  return Response.json(
    { country, currency, prefix: CURRENCY_PREFIX[currency], inrPerUnit: INR_PER_UNIT[currency], asOf: RATES_AS_OF },
    // Per visitor: never cached by a shared cache.
    { headers: { "Cache-Control": "private, no-store" } },
  )
}
