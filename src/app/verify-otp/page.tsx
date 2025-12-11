import { GalleryVerticalEnd } from "lucide-react"
import { OtpVerificationForm } from "@/components/otp-verification-form"
import Image from "next/image"

export default function VerifyOtpPage() {
  return (
    <div className="flex min-h-svh">
      <div className="hidden lg:flex items-center justify-center shrink-0">
        <Image
          src="/login.png"
          alt="Verification illustration"
          width={600}
          height={750}
          className="object-contain dark:brightness-[0.8] h-svh w-auto"
          priority
        />
      </div>
      <div className="flex flex-col gap-4 p-6 md:p-10 flex-1 min-h-svh">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Revue
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <OtpVerificationForm />
          </div>
        </div>
      </div>
    </div>
  )
}
