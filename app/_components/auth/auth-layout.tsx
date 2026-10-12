import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, FileCheck2, KeyRound, ShieldCheck } from "lucide-react";
import { BuildProofBrand } from "../buildproof-brand";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-white lg:grid lg:grid-cols-[48%_52%]">
      <aside className="relative border-b border-slate-200 bg-sky-50 lg:border-r lg:border-b-0">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(#0284c7_1px,transparent_1px),linear-gradient(90deg,#0284c7_1px,transparent_1px)] [background-size:40px_40px]"
        />
        <div className="relative mx-auto flex h-full max-w-[720px] flex-col px-6 py-6 lg:px-12 lg:py-9 xl:px-16">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="BuildProof home">
              <BuildProofBrand compact />
            </Link>
            <Link
              href="/demo"
              className="flex items-center gap-1 text-sm text-slate-600 hover:text-orange-700"
            >
              Explore demo <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="hidden flex-1 flex-col justify-center py-10 lg:flex">
            <p className="mb-5 flex items-center gap-2 text-sm font-medium text-sky-700">
              <span className="h-px w-7 bg-sky-500" />
              From site to sign-off
            </p>
            <h2 className="max-w-[480px] font-heading text-[clamp(32px,3.2vw,48px)] leading-[1.13] font-semibold tracking-[-0.045em] text-slate-950">
              Good decisions start
              <br />
              with <span className="text-orange-600">clear evidence.</span>
            </h2>
            <p className="mt-5 max-w-[420px] text-[15px] leading-7 text-slate-600">
              Keep deliveries, site records and approvals connected. Give your
              team one place to see what’s ready and what needs attention.
            </p>
            <figure className="relative mt-8 overflow-hidden rounded-xl border border-sky-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,.07)]">
              <div className="relative aspect-[16/8.8]">
                <Image
                  src="/images/buildproof-project-preview.png"
                  alt="Concrete structure and tower cranes on a construction site"
                  fill
                  priority
                  sizes="(min-width:1024px) 40vw, 100vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="flex items-center gap-3 bg-white px-5 py-4">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-orange-50 text-orange-600">
                  <FileCheck2 size={18} />
                </span>
                <div>
                  <strong className="block text-sm font-semibold text-slate-900">
                    A project record you can follow.
                  </strong>
                  <span className="text-xs text-slate-500">
                    Deliveries, inspections and decisions in one place.
                  </span>
                </div>
              </figcaption>
            </figure>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-[13px] text-slate-600">
              <span className="flex items-center gap-2">
                <KeyRound size={16} className="text-sky-600" />
                Passwordless sign-in
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-sky-600" />
                Role-based access
              </span>
            </div>
          </div>
          <p className="hidden text-xs text-slate-500 lg:block">
            BuildProof by AuraFlow · Construction project control
          </p>
        </div>
      </aside>
      <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:min-h-dvh lg:px-14">
        <div className="w-full max-w-[410px]">{children}</div>
      </section>
    </main>
  );
}
