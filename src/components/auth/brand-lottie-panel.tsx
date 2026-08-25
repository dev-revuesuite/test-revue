"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

const BrandLottiePlayer = dynamic(
  () =>
    import("@/components/auth/brand-lottie-player").then(
      (mod) => mod.BrandLottiePlayer
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="aspect-square w-full max-w-3xl animate-pulse rounded-lg bg-zinc-800/60"
        aria-hidden
      />
    ),
  }
)

/** Lazy-loads the brand Lottie only on large viewports where the panel is visible. */
export function BrandLottiePanel() {
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)")
    const sync = () => setShouldLoad(media.matches)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  if (!shouldLoad) {
    return (
      <div className="aspect-square w-full max-w-3xl" aria-hidden />
    )
  }

  return <BrandLottiePlayer />
}
