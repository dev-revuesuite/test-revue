"use client"

import * as React from "react"

import { parsePlanIntent, savePlanIntent } from "@/lib/billing/plan-intent"

/**
 * On the signup page: if the visitor came from the pricing page's "Buy Plus"
 * (?plan=plus&cycle=monthly), remember it for the /start screen. Renders nothing.
 */
export function RememberPlanIntent() {
  React.useEffect(() => {
    const choice = parsePlanIntent(new URLSearchParams(window.location.search))
    if (choice) savePlanIntent(choice)
  }, [])
  return null
}
