"use client"

import { Suspense } from "react"
import { UpdatePasswordForm } from "@/components/update-password-form"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-svh">
      <div className="hidden lg:flex w-1/2 min-h-svh items-center justify-center bg-zinc-900 p-8">
        <div className="w-full max-w-3xl">
          <DotLottieReact
            src="https://lottie.host/46eaecfd-b4c1-4e54-87fa-d87f13674f5e/sB68nYL0Su.lottie"
            loop
            autoplay
          />
        </div>
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 md:p-10 min-h-svh">
        <div className="w-full max-w-md">
          <Suspense
            fallback={
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="w-10 h-10 border-4 border-muted border-t-foreground rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Verifying your reset link...</p>
              </div>
            }
          >
            <UpdatePasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
