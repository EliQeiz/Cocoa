import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./buildproof.css";

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const headingFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["700", "800"],
  display: "swap",
});

const dataFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "BuildProof | Evidence-first construction control",
    template: "%s | BuildProof",
  },
  description: "Construction evidence, material verification and release control in one accountable record.",
  openGraph: {
    type: "website",
    title: "BuildProof | Project certainty, built on proof",
    description: "Connect material deliveries, field evidence, quality tests and professional approvals in one accountable construction record.",
    images: [{ url: "/images/buildproof-dashboard-live.png", width: 1902, height: 903, alt: "BuildProof project command centre" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BuildProof | Project certainty, built on proof",
    description: "Evidence-first construction control for accountable project delivery.",
    images: ["/images/buildproof-dashboard-live.png"],
  },
  robots: { index: true, follow: true },
  referrer: "strict-origin-when-cross-origin",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable} ${dataFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
