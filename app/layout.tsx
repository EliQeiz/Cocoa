import type { Metadata } from "next";
import { Geist, Source_Serif_4 } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";
import "./buildproof.css";

const uiFont = Geist({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const editorialFont = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-editorial",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BuildProof | Evidence-first construction control",
  description: "AuraFlow's evidence-first material control platform.",
  robots: { index: false, follow: false },
  referrer: "strict-origin-when-cross-origin",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return (
    <html lang="en" className={`${uiFont.variable} ${editorialFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
