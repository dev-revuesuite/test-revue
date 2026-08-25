import { AuthLogo } from "@/components/auth/auth-logo"
import { BrandLottiePanel } from "@/components/auth/brand-lottie-panel"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <main className="flex min-h-svh">
      <div className="hidden lg:flex w-1/2 min-h-svh items-center justify-center bg-zinc-900 p-8">
        <div className="w-full max-w-3xl">
          <BrandLottiePanel />
        </div>
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 md:p-10 min-h-svh">
        <div className="w-full max-w-md">
          <LoginForm logo={<AuthLogo />} />
        </div>
      </div>
    </main>
  )
}
