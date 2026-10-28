import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../index.css";

export const metadata: Metadata = {
  title: "Elite Drive",
  description: "Premium vehicle rental management",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Elite Drive",
    description: "Premium vehicle rental management",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}