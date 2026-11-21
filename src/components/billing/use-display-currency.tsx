"use client"

import * as React from "react"

import { useBillingContext } from "@/contexts/plan-features-context"
import {
  CURRENCY_NAMES,
  currencyForCountry,
  DISPLAY_CURRENCIES,
  isIndianTimeZone,
  localAnnualSaving,
  localPrice,
  parseDisplayCurrency,
  type DisplayCurrency,
  type LocalPrice,
} from "@/lib/billing/display-currency"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "revue:display-currency"
const CHANGE_EVENT = "revue:display-currency-change"

function readChoice(): DisplayCurrency | null {
  try {
    return parseDisplayCurrency(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

/**
 * The currency to SHOW prices in (display only; everyone is charged in INR).
 * Automatic: India if the browser's clock is on Indian time (so a VPN or proxy
 * never shows an Indian customer dollars), else the country the visit came
 * from. Visitors abroad can pick another currency (remembered); `?currency=USD`
 * in the address previews one from anywhere. Starts as INR so the first paint
 * matches the server.
 */
export function useDisplayCurrency() {
  const { country } = useBillingContext()
  // `abroad`: the visitor is (or is previewing as) outside India. Only then is
  // the currency picker offered; visitors in India never see it.
  const [state, setState] = React.useState<{ currency: DisplayCurrency; abroad: boolean }>({
    currency: "INR",
    abroad: false,
  })

  React.useEffect(() => {
    const automatic = (): DisplayCurrency => {
      let timeZone: string | undefined
      try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
      } catch {
        // no time zone information: fall through to the country
      }
      if (isIndianTimeZone(timeZone)) return "INR"
      return currencyForCountry(country)
    }
    const sync = () => {
      const fromUrl = parseDisplayCurrency(new URLSearchParams(window.location.search).get("currency"))
      const auto = automatic()
      // A saved choice only counts abroad: it can never switch a visitor in India away from rupees.
      const abroad = auto !== "INR" || fromUrl !== null
      setState({ currency: fromUrl ?? (abroad ? (readChoice() ?? auto) : "INR"), abroad })
    }
    sync()
    // Another price block on the page changed the currency: follow it.
    window.addEventListener(CHANGE_EVENT, sync)
    return () => window.removeEventListener(CHANGE_EVENT, sync)
  }, [country])

  const choose = React.useCallback((next: DisplayCurrency) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // storage blocked: the choice lasts for this view only
    }
    // A previewed currency in the address would win again on the next read:
    // keep the address in step with what was just picked.
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.has("currency")) {
        url.searchParams.set("currency", next)
        window.history.replaceState(window.history.state, "", url.toString())
      }
    } catch {
      // address can't be updated: the choice still applies to this view
    }
    setState((previous) => ({ ...previous, currency: next }))
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  const { currency, abroad } = state
  const price = React.useCallback((amountInr: number): LocalPrice => localPrice(amountInr, currency), [currency])

  const annualSaving = React.useCallback(
    (monthlyInr: number, annualInr: number) => localAnnualSaving(monthlyInr, annualInr, currency),
    [currency],
  )

  return { currency, foreign: currency !== "INR", abroad, price, annualSaving, choose }
}

/** Small "Show prices in" picker for the pricing screens. */
export function CurrencySwitcher({
  currency,
  onChange,
  tone = "default",
  className,
}: {
  currency: DisplayCurrency
  onChange: (currency: DisplayCurrency) => void
  /** "dark" for the dark start screen. */
  tone?: "default" | "dark"
  className?: string
}) {
  const id = React.useId()
  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <label htmlFor={id} className={tone === "dark" ? "text-zinc-500" : "text-muted-foreground"}>
        Show prices in
      </label>
      <select
        id={id}
        value={currency}
        onChange={(event) => {
          const next = parseDisplayCurrency(event.target.value)
          if (next) onChange(next)
        }}
        className={cn(
          "rounded-md border px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2",
          tone === "dark"
            ? "border-zinc-800 bg-zinc-900 text-zinc-200 focus-visible:ring-[#DBFE52]"
            : "border-border bg-background text-foreground focus-visible:ring-ring",
        )}
      >
        {DISPLAY_CURRENCIES.map((code) => (
          <option key={code} value={code}>
            {CURRENCY_NAMES[code]}
          </option>
        ))}
      </select>
    </div>
  )
}

/** One sentence that keeps a guide price honest. Renders nothing for rupees. */
export function ChargedInInrNote({ currency, className }: { currency: DisplayCurrency; className?: string }) {
  if (currency === "INR") return null
  return (
    <p className={className}>
      Prices in {currency} are approximate. You&apos;re charged in Indian rupees (INR); your bank sets the final rate.
    </p>
  )
}
