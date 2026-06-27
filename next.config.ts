import type { NextConfig } from "next";

import { APP_BASE_PATH } from "./src/lib/base-path";

const nextConfig: NextConfig = {
  basePath: APP_BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: APP_BASE_PATH,
  },
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
  async redirects() {
    return [
      {
        source: "/",
        destination: APP_BASE_PATH,
        permanent: false,
        basePath: false,
      },
      {
        source: "/QC-Tool",
        destination: APP_BASE_PATH,
        permanent: true,
        basePath: false,
      },
      {
        source: "/QC-Tool/:path*",
        destination: `${APP_BASE_PATH}/:path*`,
        permanent: true,
        basePath: false,
      },
    ]
  },
};

export default nextConfig;
