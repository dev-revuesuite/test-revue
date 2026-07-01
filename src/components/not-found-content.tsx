"use client"

import Link from "next/link"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"
import { Button } from "@/components/ui/button"
import { publicPath } from "@/lib/base-path"

const NOT_FOUND_LOTTIE = encodeURI(
  publicPath("/assets/404 Page Not Found.lottie")
)

export function NotFoundContent() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-12 text-center">
      <div className="w-full max-w-md">
        <DotLottieReact src={NOT_FOUND_LOTTIE} loop autoplay />
      </div>

      <div className="mt-2 max-w-lg space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          Please check your URL — you might have typed the wrong path.
        </p>
      </div>

      <Button asChild className="mt-8 bg-[#5C6ECD] hover:bg-[#4a5bb8] text-white">
        <Link href="/">Go to home</Link>
      </Button>
    </div>
  )
}
