"use client"

import { DotLottieReact } from "@lottiefiles/dotlottie-react"

import { BRAND_LOTTIE } from "@/lib/lottie-assets"

export function BrandLottiePlayer() {
  return <DotLottieReact src={BRAND_LOTTIE} loop autoplay />
}
