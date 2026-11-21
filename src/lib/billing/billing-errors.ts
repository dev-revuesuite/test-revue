/** A billing request that failed in a way the user should hear about. */
export class BillingRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "BillingRequestError"
  }
}
