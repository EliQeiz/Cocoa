import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { connection } from "next/server";
import { RegisterServiceWorker } from "./_components/offline/register-service-worker";
import "./globals.css";
import "./buildproof.css";
import "./styles/workspace-command.css";

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const headingFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["600", "700", "800"],
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
  manifest: "/manifest.webmanifest",
  applicationName: "BuildProof",
  appleWebApp: {
    capable: true,
    title: "BuildProof",
    statusBarStyle: "black-translucent",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Strict nonce CSP needs request-time rendering, including public auth pages.
  // Prerendered HTML cannot carry the proxy's fresh nonce and will not hydrate.
  await connection();
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable} ${dataFont.variable}`}>
      <body>
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
