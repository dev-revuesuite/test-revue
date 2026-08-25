import { JetBrains_Mono, Outfit } from "next/font/google"

/** Auth screens — three weights cover login/signup UI without loading the full set. */
const outfitAuth = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
})

/** App shell — full weight range used across studio, revue, and dashboards. */
const outfitApp = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

export const authFontClassName = `${outfitAuth.variable} font-sans antialiased`
export const appFontClassName = `${outfitApp.variable} ${jetbrainsMono.variable} font-sans antialiased`
