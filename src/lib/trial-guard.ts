/**
 * After the free trial ends the organization is view-only: viewing stays
 * allowed, and changes are replaced by the upgrade dialog (`onBlocked`).
 * Use this around the write itself, never around opening a view.
 */
export function runIfWritable<T>(
  trialExpired: boolean,
  write: () => T,
  onBlocked: () => void
): T | undefined {
  if (trialExpired) {
    onBlocked()
    return undefined
  }
  return write()
}
