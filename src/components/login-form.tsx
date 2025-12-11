"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { Send } from "lucide-react"

type LoginMode = "initial" | "password" | "otp"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [mode, setMode] = useState<LoginMode>("initial")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleSendOtp = async () => {
    if (!email) {
      setError("Please enter your email address")
      return
    }
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setMode("otp")
    setOtpSent(true)
    setResendCooldown(60)
    setLoading(false)
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("")
      const newOtp = [...otp]
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit
        }
      })
      setOtp(newOtp)
      const nextIndex = Math.min(index + digits.length, 5)
      otpRefs.current[nextIndex]?.focus()
      return
    }

    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpLogin = async () => {
    const otpString = otp.join("")
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit code")
      return
    }

    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpString,
      type: "email",
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  const handlePasswordLogin = async () => {
    if (!email || !password) {
      setError("Please enter email and password")
      return
    }

    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "password") {
      handlePasswordLogin()
    } else if (mode === "otp" && otpSent) {
      handleOtpLogin()
    }
  }

  return (
    <div className={cn("flex flex-col gap-8", className)} {...props}>
      {/* Logo placeholder */}
      <div className="flex justify-center">
        <div className="w-40 h-14 bg-muted rounded-md" />
      </div>

      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold">Login</h1>
        <p className="text-muted-foreground text-base">
          Enter your email below to login to your account.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Email field */}
        <div className="flex flex-col gap-2">
          {mode === "otp" && otpSent ? (
            <div className="flex items-center gap-3">
              <Label htmlFor="email" className="w-24 shrink-0 text-base">Email</Label>
              <div className="relative flex-1">
                <Input
                  id="email"
                  type="email"
                  placeholder="xyz@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-12 h-12 text-base"
                  disabled
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={handleSendOtp}
                  disabled={loading || resendCooldown > 0}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Label htmlFor="email" className="w-24 shrink-0 text-base">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="xyz@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-base"
                required
              />
            </div>
          )}
        </div>

        {/* Password field - only in password mode */}
        {mode === "password" && (
          <div className="flex items-center gap-3">
            <Label htmlFor="password" className="w-24 shrink-0 text-base">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 text-base"
              required
            />
          </div>
        )}

        {/* OTP fields - only when OTP is sent */}
        {mode === "otp" && otpSent && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Label className="w-24 shrink-0 text-base">Verification code</Label>
              <div className="flex gap-2 flex-1 justify-between">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-11 h-11 text-center text-lg p-0 flex-shrink-0"
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end pr-1">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={resendCooldown > 0 || loading}
                className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend (${resendCooldown})` : "Resend"}
              </button>
            </div>
          </div>
        )}

        {/* Main action button */}
        {mode === "initial" && (
          <Button
            type="button"
            onClick={handleSendOtp}
            disabled={loading}
            className="w-full h-12 text-base bg-[#DBFE52] hover:bg-[#c9eb40] text-black font-medium border border-gray-400"
          >
            {loading ? "Sending..." : "Login"}
          </Button>
        )}

        {mode === "password" && (
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base bg-[#DBFE52] hover:bg-[#c9eb40] text-black font-medium border border-gray-400"
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        )}

        {mode === "otp" && otpSent && (
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base bg-[#DBFE52] hover:bg-[#c9eb40] text-black font-medium border border-gray-400"
          >
            {loading ? "Verifying..." : "Login"}
          </Button>
        )}

        {/* Separator */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background px-3 text-muted-foreground">
              or continue with
            </span>
          </div>
        </div>

        {/* Google login */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full h-12 text-base"
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Login with Google
        </Button>

        {/* Footer link */}
        <p className="text-center text-base text-muted-foreground">
          Don&apos;t have an account yet?{" "}
          <a href="/signup" className="underline underline-offset-4 hover:text-primary">
            Create new
          </a>
        </p>

        {/* Mode toggle - small text link */}
        {mode !== "initial" && (
          <p className="text-center text-sm text-muted-foreground">
            {mode === "password" ? (
              <button
                type="button"
                onClick={() => {
                  setMode("otp")
                  setOtpSent(false)
                  setOtp(["", "", "", "", "", ""])
                }}
                className="underline hover:text-primary"
              >
                Use verification code instead
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode("password")
                  setOtpSent(false)
                  setOtp(["", "", "", "", "", ""])
                }}
                className="underline hover:text-primary"
              >
                Use password instead
              </button>
            )}
          </p>
        )}
      </form>
    </div>
  )
}
