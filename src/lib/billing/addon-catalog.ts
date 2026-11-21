// Add-ons that can be bought, with their prices (rupees, GST included).
//
// This list is the price authority: the browser only sends an item ID, and the
// server takes the amount from here when it creates the Razorpay order. Keep it
// in sync with the pricing page (QC pack: 100 / 500 / 2,000 runs; storage:
// +50 GB / +200 GB / +1 TB).
//
// Decided 2026-11-21: a QC pack is valid for 12 months; storage is added for
// 30 days per purchase (buying again extends it).

export type AddonKind = "qc_pack" | "storage"

export type AddonItem = {
  id: string
  kind: AddonKind
  /** Runs for a QC pack, GB for storage. */
  quantity: number
  priceInr: number
  label: string
}

export const ADDON_ITEMS: readonly AddonItem[] = [
  { id: "qc_100", kind: "qc_pack", quantity: 100, priceInr: 900, label: "100 QC runs" },
  { id: "qc_500", kind: "qc_pack", quantity: 500, priceInr: 4000, label: "500 QC runs" },
  { id: "qc_2000", kind: "qc_pack", quantity: 2000, priceInr: 14000, label: "2,000 QC runs" },
  { id: "storage_50", kind: "storage", quantity: 50, priceInr: 400, label: "+50 GB" },
  { id: "storage_200", kind: "storage", quantity: 200, priceInr: 1200, label: "+200 GB" },
  { id: "storage_1024", kind: "storage", quantity: 1024, priceInr: 4000, label: "+1 TB" },
]

export const QC_PACK_VALID_MONTHS = 12
export const STORAGE_ADDON_DAYS = 30

/** The item for an ID sent by the browser, or null for anything else. */
export function findAddonItem(id: unknown): AddonItem | null {
  if (typeof id !== "string") return null
  return ADDON_ITEMS.find((item) => item.id === id) ?? null
}

export const addonAmountPaise = (item: AddonItem): number => item.priceInr * 100
