import { LoginForm } from "@/components/login-form"
import Image from "next/image"

export default function LoginPage() {
  return (
    <div className="flex min-h-svh">
      <div className="hidden lg:flex items-center justify-center shrink-0">
        <Image
          src="/login.png"
          alt="Login illustration"
          width={600}
          height={750}
          className="object-contain dark:brightness-[0.8] h-svh w-auto"
          priority
        />
      </div>
      <div className="flex flex-1 items-center justify-center p-6 md:p-10 min-h-svh">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
