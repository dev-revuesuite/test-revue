"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Please enter your name")
      return
    }
    if (!email) {
      setError("Please enter your email address")
      return
    }
    if (!password) {
      setError("Please enter a password")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const userId = data.user?.id
    if (userId) {
      await supabase.from("profiles").upsert(
        {
          id: userId,
          email: data.user?.email || email,
          full_name: name,
          onboarded: false,
        },
        { onConflict: "id" }
      )

      // Auto-link to organization if email was pre-added as a team member
      await supabase.rpc("link_user_to_org_member", {
        p_user_id: userId,
        p_email: data.user?.email || email,
      })
    }

    router.push("/onboarding")
    router.refresh()
  }

  const handleGoogleSignup = async () => {
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

  return (
    <div className={cn("flex flex-col gap-8", className)} {...props}>
      {/* Logo */}
      <div className="flex justify-center">
        <Image
          src="/Logo/Artboard 8@2x.png"
          alt="Revue"
          width={160}
          height={49}
          priority
          className="dark:hidden"
        />
        <Image
          src="/Logo/Artboard 8 copy@2x.png"
          alt="Revue"
          width={160}
          height={49}
          priority
          className="hidden dark:block"
        />
      </div>

      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold">Create account</h1>
        <p className="text-muted-foreground text-base">
          Enter your details below to sign up.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSignup} className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Label htmlFor="name" className="w-24 shrink-0 text-base">
            Full name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 text-base"
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="email" className="w-24 shrink-0 text-base">
            Email
          </Label>
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

        <div className="flex items-center gap-3">
          <Label htmlFor="password" className="w-24 shrink-0 text-base">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 text-base"
            required
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-base bg-[#DBFE52] hover:bg-[#c9eb40] text-black font-medium border border-gray-400"
        >
          {loading ? "Creating account..." : "Sign up"}
        </Button>

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

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignup}
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
          Sign up with Google
        </Button>

        <p className="text-center text-base text-muted-foreground">
          Already have an account?{" "}
          <a href="/login" className="underline underline-offset-4 hover:text-primary">
            Sign in
          </a>
        </p>
      </form>
    </div>
  )
}
