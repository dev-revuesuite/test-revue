import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

import { APP_BASE_PATH, CANONICAL_APP_ORIGIN } from "./src/lib/base-path";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  basePath: APP_BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: APP_BASE_PATH,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? CANONICAL_APP_ORIGIN,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  serverExternalPackages: [
    "pdfjs-dist",
    "@napi-rs/canvas",
    "@neslinesli93/qpdf-wasm",
  ],
};

export default withBundleAnalyzer(nextConfig);
