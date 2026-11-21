import { describe, expect, it } from "vitest"

import {
  convertFromInr,
  currencyForCountry,
  DISPLAY_CURRENCIES,
  formatCurrencyAmount,
  INR_PER_UNIT,
  isIndianTimeZone,
  localAnnualSaving,
  localPrice,
  parseDisplayCurrency,
} from "@/lib/billing/display-currency"

describe("currencyForCountry", () => {
  it.each([
    ["IN", "INR"],
    ["US", "USD"],
    ["GB", "GBP"],
    ["DE", "EUR"],
    ["FR", "EUR"],
    ["AE", "AED"],
    ["SG", "SGD"],
    ["AU", "AUD"],
    ["CA", "CAD"],
    ["in", "INR"],
  ])("%s -> %s", (country, currency) => {
    expect(currencyForCountry(country)).toBe(currency)
  })

  it("a country we have no currency for gets US dollars", () => {
    expect(currencyForCountry("BR")).toBe("USD")
    expect(currencyForCountry("JP")).toBe("USD")
  })

  it("no or unreadable country means rupees (nothing changes)", () => {
    expect(currencyForCountry(null)).toBe("INR")
    expect(currencyForCountry(undefined)).toBe("INR")
    expect(currencyForCountry("")).toBe("INR")
    expect(currencyForCountry("not-a-country")).toBe("INR")
  })
})

describe("converting and formatting", () => {
  it("rupees stay exactly as they are", () => {
    expect(localPrice(2499, "INR")).toEqual({ main: "₹2,499", chargedInr: null })
    expect(localPrice(99999, "INR").main).toBe("₹99,999")
  })

  it("another currency shows a whole-number guide price and the rupee amount that is charged", () => {
    const usd = localPrice(2499, "USD")
    expect(usd.main).toBe(`$${Math.round(2499 / INR_PER_UNIT.USD)}`)
    expect(usd.chargedInr).toBe("₹2,499")
    expect(localPrice(2499, "EUR").main.startsWith("€")).toBe(true)
    expect(localPrice(2499, "GBP").main.startsWith("£")).toBe(true)
  })

  it("uses each currency's own symbol, the same in every browser", () => {
    expect(formatCurrencyAmount(34, "SGD")).toBe("S$34")
    expect(formatCurrencyAmount(38, "AUD")).toBe("A$38")
    expect(formatCurrencyAmount(37, "CAD")).toBe("CA$37")
    expect(formatCurrencyAmount(98, "AED")).toBe("AED 98")
    expect(formatCurrencyAmount(1064, "USD")).toBe("$1,064")
  })

  it("the annual saving matches the prices shown beside it", () => {
    // rupees: exact
    expect(localAnnualSaving(2499, 24999, "INR")).toBe("₹4,989")
    // another currency: 12 x rounded monthly - rounded annual
    const monthly = convertFromInr(2499, "USD")
    const annual = convertFromInr(24999, "USD")
    expect(localAnnualSaving(2499, 24999, "USD")).toBe("$" + String(monthly * 12 - annual))
    // no saving -> nothing to show
    expect(localAnnualSaving(100, 1200, "USD")).toBeNull()
  })

  it("never shows a real price as 0", () => {
    expect(convertFromInr(40, "GBP")).toBe(1)
  })

  it("free stays free", () => {
    expect(convertFromInr(0, "USD")).toBe(0)
    expect(localPrice(0, "USD").main).toBe("$0")
  })

  it("every listed currency has a rate and formats without decimals", () => {
    for (const currency of DISPLAY_CURRENCIES) {
      expect(INR_PER_UNIT[currency]).toBeGreaterThan(0)
      expect(formatCurrencyAmount(1234, currency)).not.toContain(".")
    }
  })
})

describe("parseDisplayCurrency", () => {
  it("accepts the listed currencies in any case, and nothing else", () => {
    expect(parseDisplayCurrency("usd")).toBe("USD")
    expect(parseDisplayCurrency(" EUR ")).toBe("EUR")
    expect(parseDisplayCurrency("JPY")).toBeNull()
    expect(parseDisplayCurrency(null)).toBeNull()
    expect(parseDisplayCurrency(42)).toBeNull()
  })
})

describe("isIndianTimeZone", () => {
  it("recognises both names of India's time zone", () => {
    expect(isIndianTimeZone("Asia/Kolkata")).toBe(true)
    expect(isIndianTimeZone("Asia/Calcutta")).toBe(true)
    expect(isIndianTimeZone("America/New_York")).toBe(false)
    expect(isIndianTimeZone(undefined)).toBe(false)
  })
})
