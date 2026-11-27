// Hands out Cloudflare Turnstile tokens to the auth forms. A token works for
// one Supabase request only, so after one is used the widget is reset to get a
// fresh one the next time a form asks. No DOM here, so it is unit-tested.

export class CaptchaTimeoutError extends Error {
  constructor() {
    super("Please complete the security check, then try again.")
    this.name = "CaptchaTimeoutError"
  }
}

export class CaptchaTokens {
  private token: string | null = null
  private used = false
  private waiters: ((token: string) => void)[] = []

  /** `reset` asks the widget for a new token. */
  constructor(private readonly reset: () => void) {}

  /** The widget issued a token. */
  issue(token: string) {
    const waiter = this.waiters.shift()
    if (!waiter) {
      this.token = token
      return
    }
    this.used = true
    waiter(token)
    if (this.waiters.length > 0) {
      this.used = false
      this.reset()
    }
  }

  /** The widget's token expired or the check failed; a new one will be issued. */
  clear() {
    this.token = null
  }

  /** A token for one request. Waits for the widget if none is ready yet. */
  take(timeoutMs: number): Promise<string> {
    if (this.token) {
      const token = this.token
      this.token = null
      this.used = true
      return Promise.resolve(token)
    }
    if (this.used) {
      this.used = false
      this.reset()
    }
    return new Promise((resolve, reject) => {
      const waiter = (token: string) => {
        clearTimeout(timer)
        resolve(token)
      }
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== waiter)
        reject(new CaptchaTimeoutError())
      }, timeoutMs)
      this.waiters.push(waiter)
    })
  }
}
