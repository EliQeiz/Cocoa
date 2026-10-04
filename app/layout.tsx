import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";
import "./buildproof.css";

export const metadata: Metadata = {
  title: "BuildProof | Evidence-first construction control",
  description: "AuraFlow's evidence-first material control platform.",
  robots: { index: false, follow: false },
  referrer: "strict-origin-when-cross-origin",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
