"use client"

import * as React from "react"

import { UpgradeDialog } from "@/components/billing/upgrade-dialog"

/**
 * Opens the upgrade dialog from anywhere (mounted once in the app layout).
 *
 * Why a single host instead of a dialog inside each Upgrade button: dialogs
 * trap the mouse and keyboard. A plan picker opened inside another dialog (or
 * left open behind Razorpay's checkout) would block typing in the payment
 * window. So other dialogs close themselves when the upgrade opens
 * (useCloseWhenUpgradeOpens), and the upgrade dialog hides while Razorpay is open.
 */
export const OPEN_UPGRADE_EVENT = "revue:open-upgrade"

export function openUpgradeDialog(): void {
  window.dispatchEvent(new Event(OPEN_UPGRADE_EVENT))
}

/** Closes a dialog that offers "Upgrade" as soon as the upgrade dialog opens. */
export function useCloseWhenUpgradeOpens(close: () => void): void {
  const closeRef = React.useRef(close)
  React.useEffect(() => {
    closeRef.current = close
  })
  React.useEffect(() => {
    const handler = () => closeRef.current()
    window.addEventListener(OPEN_UPGRADE_EVENT, handler)
    return () => window.removeEventListener(OPEN_UPGRADE_EVENT, handler)
  }, [])
}

export function UpgradeDialogHost() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener(OPEN_UPGRADE_EVENT, handler)
    return () => window.removeEventListener(OPEN_UPGRADE_EVENT, handler)
  }, [])

  // Mounted only while open, so every opening starts fresh.
  return open ? <UpgradeDialog open onOpenChange={setOpen} /> : null
}
