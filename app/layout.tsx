import type { Metadata } from "next";
import "./globals.css";
import "./buildproof.css";

export const metadata: Metadata = {
  title: "BuildProof | Evidence-first construction control",
  description: "AuraFlow's evidence-first material control platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
