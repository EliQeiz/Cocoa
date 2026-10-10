import Image from "next/image";
import type { ReactNode } from "react";
import { Database, KeyRound, ShieldCheck } from "lucide-react";
import authWorker from "@/public/images/buildproof-auth-worker-v2.png";
import { BuildProofBrand } from "../buildproof-brand";

const trustItems = [
  { label: "Tenant-isolated data", icon: Database },
  { label: "Passwordless access", icon: KeyRound },
  { label: "Enterprise-grade security", icon: ShieldCheck },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-white lg:grid lg:grid-cols-[45%_55%]">
      <aside className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-orange-50 via-white to-sky-50 lg:min-h-dvh lg:border-b-0 lg:border-r">
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(#102b43_1px,transparent_1px),linear-gradient(90deg,#102b43_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative mx-auto flex max-w-2xl items-center justify-between px-5 py-5 lg:min-h-dvh lg:flex-col lg:items-stretch lg:justify-start lg:px-12 lg:py-10 xl:px-16">
          <BuildProofBrand compact className="auth-brand" />
          <div className="hidden lg:block">
            <h1 className="mt-12 max-w-lg font-heading text-[40px] font-bold leading-[1.08] tracking-[-0.02em] text-slate-950">Evidence builds what’s next.</h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">A defensible project record for the teams responsible for what arrives, what gets built and what gets approved.</p>
            <figure className="mt-8 overflow-hidden rounded-2xl border border-white/80 bg-white p-2 shadow-[0_20px_55px_rgba(15,23,42,0.12)]">
              <div className="relative aspect-[16/8.8] overflow-hidden rounded-xl">
                <Image src={authWorker} alt="Construction professional reviewing site evidence" fill priority placeholder="blur" className="object-cover" sizes="45vw" />
              </div>
            </figure>
            <ul className="mt-8 grid gap-3 sm:grid-cols-3" aria-label="BuildProof security principles">
              {trustItems.map(({ label, icon: Icon }) => <li key={label} className="flex items-center gap-2.5 text-sm font-semibold text-slate-700"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-orange-100 bg-white text-orange-600"><Icon size={18} /></span>{label}</li>)}
            </ul>
          </div>
          <p className="hidden pt-8 text-sm text-slate-500 lg:mt-auto lg:block">Built for accountable construction delivery.</p>
        </div>
      </aside>
      <section className="flex min-h-[calc(100dvh-80px)] items-center bg-white px-5 py-10 sm:px-8 lg:min-h-dvh lg:px-14 xl:px-20">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
