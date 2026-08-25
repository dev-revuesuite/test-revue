import Image from "next/image"

import { publicPath } from "@/lib/base-path"

const LOGO_WIDTH = 140
const LOGO_HEIGHT = 43

/**
 * Auth screens: smaller welcome assets (~140px wide) to cut image weight.
 * Light logo is prioritized; dark variant lazy-loads only when needed.
 */
export function AuthLogo() {
  return (
    <div className="flex justify-center">
      <Image
        src={publicPath("/Logo/Artboard_5-welcome-140.png")}
        alt="Revue"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        sizes="140px"
        priority
        className="h-auto w-[140px] dark:hidden"
      />
      <Image
        src={publicPath("/Logo/Artboard_1-welcome-140.png")}
        alt="Revue"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        sizes="140px"
        loading="lazy"
        className="hidden h-auto w-[140px] dark:block"
      />
    </div>
  )
}
