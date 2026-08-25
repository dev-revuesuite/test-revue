import type { Metadata } from "next";

import { publicPath } from "@/lib/base-path";
import "./globals.css";

export const metadata: Metadata = {
  title: "Revue - Design Review Tool",
  description: "Collaborative design review and feedback tool",
  icons: {
    icon: publicPath("/Logo/Artboard_4-header-48.png"),
    apple: publicPath("/Logo/Artboard_4-header-96.png"),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
