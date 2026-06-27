import type { NextConfig } from "next";

import { APP_BASE_PATH } from "./src/lib/base-path";

const nextConfig: NextConfig = {
  basePath: APP_BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: APP_BASE_PATH,
  },
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
