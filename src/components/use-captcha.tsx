"use client"

// Cloudflare Turnstile for the auth forms. Supabase checks the token on sign-up,
// password sign-in, resending the email code and password reset, once CAPTCHA
// is switched on in Supabase (Authentication > Bot and Abuse Protection).
//
// Without NEXT_PUBLIC_TURNSTILE_SITE_KEY nothing is shown and no token is sent,
// which works only while CAPTCHA is off in Supabase. So: set the key and deploy
// first, then switch CAPTCHA on.
//
// "interaction-only": most people never see it; a box appears only when
// Cloudflare wants a click.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"

import { CaptchaTokens } from "@/lib/captcha-tokens"

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? ""
const READY_CALLBACK = "__revueTurnstileReady"
const SCRIPT_URL = `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=${READY_CALLBACK}`
/** Long enough to tick the box if Cloudflare asks for it. */
const WAIT_MS = 60_000

type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string
  reset(widgetId: string): void
  remove(widgetId: string): void
}

type TurnstileWindow = Window & {
  turnstile?: TurnstileApi
  [READY_CALLBACK]?: () => void
}

let scriptLoading: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  const win = window as TurnstileWindow
  if (win.turnstile) return Promise.resolve(win.turnstile)
  scriptLoading ??= new Promise<TurnstileApi>((resolve, reject) => {
    win[READY_CALLBACK] = () => (win.turnstile ? resolve(win.turnstile) : reject(new Error("Turnstile missing")))
    const script = document.createElement("script")
    script.src = SCRIPT_URL
    script.async = true
    script.onerror = () => {
      scriptLoading = null
      script.remove()
      reject(new Error("Turnstile failed to load"))
    }
    document.head.appendChild(script)
  })
  return scriptLoading
}

/** True when Supabase rejected the request because the security check failed. */
export function isCaptchaFailure(error: { code?: string } | null | undefined): boolean {
  return error?.code === "captcha_failed"
}

export const CAPTCHA_FAILED_MESSAGE = "The security check didn't go through. Please try again."

export function useCaptcha(): {
  /** Token for one auth request; undefined when CAPTCHA isn't set up. Throws a user-facing Error. */
  getToken: () => Promise<string | undefined>
  /** Put this inside the form, above the submit button. */
  widget: ReactNode
} {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const tokensRef = useRef<CaptchaTokens | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  const tokens = () => {
    tokensRef.current ??= new CaptchaTokens(() => {
      const win = window as TurnstileWindow
      if (widgetIdRef.current) win.turnstile?.reset(widgetIdRef.current)
    })
    return tokensRef.current
  }

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false
    loadTurnstile()
      .then((api) => {
        if (cancelled || !containerRef.current) return
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: SITE_KEY,
          appearance: "interaction-only",
          size: "flexible",
          theme: "auto",
          callback: (token: string) => {
            setUnavailable(false)
            tokens().issue(token)
          },
          "expired-callback": () => tokens().clear(),
          "error-callback": () => {
            tokens().clear()
            setUnavailable(true)
          },
        })
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true)
      })
    return () => {
      cancelled = true
      const win = window as TurnstileWindow
      if (widgetIdRef.current) win.turnstile?.remove(widgetIdRef.current)
      widgetIdRef.current = null
      tokensRef.current = null
    }
  }, [])

  const getToken = useCallback(async () => {
    if (!SITE_KEY) return undefined
    return tokens().take(WAIT_MS)
  }, [])

  const widget = SITE_KEY ? (
    <div className="flex flex-col gap-2">
      <div ref={containerRef} />
      {unavailable ? (
        <p className="text-sm text-muted-foreground" role="status">
          The security check couldn&apos;t load. Check your connection or turn off ad blockers for this page, then
          refresh.
        </p>
      ) : null}
    </div>
  ) : null

  return { getToken, widget }
}
