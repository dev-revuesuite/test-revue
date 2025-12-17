"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

export function OtpVerificationForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("verifyEmail")
    if (storedEmail) {
      setEmail(storedEmail)
    } else {
      router.push("/signup")
    }
  }, [router])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").slice(0, 6).split("")
      const newOtp = [...otp]
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit
        }
      })
      setOtp(newOtp)
      const nextIndex = Math.min(index + digits.length, 5)
      inputRefs.current[nextIndex]?.focus()
      return
    }

    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const otpString = otp.join("")
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit code")
      return
    }

    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpString,
      type: "signup",
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    sessionStorage.removeItem("verifyEmail")
    router.push("/studio")
    router.refresh()
  }

  const handleResend = async () => {
    setError(null)
    setResendLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    })

    if (error) {
      setError(error.message)
      setResendLoading(false)
      return
    }

    setResendCooldown(60)
    setResendLoading(false)
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleVerify}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Verify your email</h1>
          <p className="text-muted-foreground text-sm text-balance">
            We sent a 6-digit code to {email}
          </p>
        </div>
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}
        <Field>
          <FieldLabel>Verification Code</FieldLabel>
          <div className="flex gap-2 justify-center">
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-xl font-semibold"
                required
              />
            ))}
          </div>
          <FieldDescription className="text-center">
            Enter the 6-digit code from your email
          </FieldDescription>
        </Field>
        <Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify Email"}
          </Button>
        </Field>
        <Field>
          <Button
            variant="outline"
            type="button"
            onClick={handleResend}
            disabled={resendLoading || resendCooldown > 0}
          >
            {resendLoading
              ? "Sending..."
              : resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Resend code"}
          </Button>
          <FieldDescription className="px-6 text-center">
            Didn&apos;t receive the code? Check your spam folder or{" "}
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem("verifyEmail")
                router.push("/signup")
              }}
              className="underline underline-offset-4 hover:text-primary"
            >
              use a different email
            </button>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
