"use client"

import * as React from "react"
import { Check, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { usePermissions } from "@/contexts/permission-context"
import { useBillingContext, useTrialExpired } from "@/contexts/plan-features-context"
import { ADDON_ITEMS, QC_PACK_VALID_MONTHS, STORAGE_ADDON_DAYS, type AddonItem } from "@/lib/billing/addon-catalog"
import {
  CheckoutError,
  confirmAddon,
  openAddonCheckout,
  requestAddonOrder,
  waitForAddon,
} from "@/lib/billing/checkout-client"
import { formatInr, isBillingEnabled } from "@/lib/billing/plan-prices"

type State =
  | { kind: "idle"; error?: string }
  | { kind: "starting" | "confirming"; itemId: string }
  | { kind: "done" | "slow"; label: string }

const GROUPS: { kind: AddonItem["kind"]; title: string; note: string }[] = [
  {
    kind: "qc_pack",
    title: "More QC runs",
    note: `Used after your plan's runs, in this workspace. Valid for ${QC_PACK_VALID_MONTHS} months.`,
  },
  {
    kind: "storage",
    title: "More storage",
    note: `Added for ${STORAGE_ADDON_DAYS} days and shared across all your workspaces. Buy again to keep it; it doesn't renew by itself.`,
  },
]

/**
 * "Add-ons" on the Plan tab: one-time purchases of extra QC runs or storage
 * (owner only, while billing is switched on and the workspace isn't view-only).
 * Paying here grants nothing by itself: after Razorpay's window reports
 * success, the server checks the order with Razorpay and adds the purchase.
 */
export function AddonShop() {
  const { isOrgOwner } = usePermissions()
  const { organizationId, email, name } = useBillingContext()
  const viewOnly = useTrialExpired()
  const [state, setState] = React.useState<State>({ kind: "idle" })

  if (!isBillingEnabled() || !isOrgOwner || !organizationId || viewOnly) return null

  const busy = state.kind === "starting" || state.kind === "confirming"

  const buy = async (item: AddonItem) => {
    setState({ kind: "starting", itemId: item.id })
    try {
      const order = await requestAddonOrder({ organizationId, item: item.id })
      const outcome = await openAddonCheckout(order, { label: item.label, email, name })
      if (outcome === "dismissed") {
        setState({ kind: "idle" })
        return
      }
      setState({ kind: "confirming", itemId: item.id })
      const added = await waitForAddon(() => confirmAddon(order.orderId))
      setState({ kind: added ? "done" : "slow", label: item.label })
      // Reload so the usage numbers above include the purchase.
      if (added) window.setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      setState({
        kind: "idle",
        error:
          error instanceof CheckoutError
            ? error.message
            : "Something went wrong. You haven't been charged twice; please try again.",
      })
    }
  }

  return (
    <section aria-labelledby="addon-shop-title" className="border border-border rounded-xl p-5 bg-card mb-4">
      <h3 id="addon-shop-title" className="text-sm font-semibold text-foreground">
        Add-ons
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        One-time payments on top of your plan. Pay with UPI, card or netbanking.
      </p>

      {state.kind === "done" || state.kind === "slow" ? (
        <p
          role="status"
          className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200"
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {state.kind === "done"
            ? `${state.label} added. Updating your usage…`
            : `Payment received for ${state.label}. We're adding it to your account; this can take a few minutes. You won't be charged again.`}
        </p>
      ) : null}

      {state.kind === "idle" && state.error ? (
        <p role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {GROUPS.map((group) => (
          <div key={group.kind}>
            <p className="text-sm font-medium text-foreground">{group.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{group.note}</p>
            <ul className="mt-3 space-y-2">
              {ADDON_ITEMS.filter((item) => item.kind === group.kind).map((item) => {
                const working = busy && state.itemId === item.id
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                    <span className="text-sm text-foreground">
                      {item.label}
                      <span className="ml-2 tabular-nums text-muted-foreground">{formatInr(item.priceInr)}</span>
                    </span>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void buy(item)}>
                      {working ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {state.kind === "confirming" ? "Confirming…" : "Opening…"}
                        </>
                      ) : (
                        <>
                          Buy<span className="sr-only"> {item.label}</span>
                        </>
                      )}
                    </Button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
