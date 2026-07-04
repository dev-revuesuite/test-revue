import type { NextConfig } from "next";

import { APP_BASE_PATH, CANONICAL_APP_ORIGIN } from "./src/lib/base-path";

const nextConfig: NextConfig = {
  basePath: APP_BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: APP_BASE_PATH,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? CANONICAL_APP_ORIGIN,
  },
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
