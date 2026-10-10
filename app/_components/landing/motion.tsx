"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Camera, Check, ClipboardCheck, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import dashboard from "@/public/images/buildproof-dashboard-live.png";
import siteEngineer from "@/public/images/buildproof-site-engineer.png";

export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function HeroProductPreview() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="relative mx-auto w-full max-w-[760px] pb-20 pt-3 sm:pb-16 lg:mx-0"
      initial={reduceMotion ? false : { opacity: 0, x: 22 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute -inset-4 -z-10 rounded-[36px] bg-[#E3F5FB]/70" aria-hidden="true" />
      <div className="overflow-hidden rounded-[20px] border border-[#C8DCE6] bg-white p-2 shadow-[0_26px_64px_rgba(16,43,67,0.16)] sm:p-2.5">
        <div className="flex h-10 items-center justify-between rounded-t-[13px] border-b border-[#DCE7ED] bg-[#FAFBFC] px-3.5">
          <div className="flex gap-1.5" aria-hidden="true"><span className="h-2.5 w-2.5 rounded-full bg-[#F4B48E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#9DDCF0]" /><span className="h-2.5 w-2.5 rounded-full bg-[#DCE7ED]" /></div>
          <div className="hidden items-center gap-2 text-sm font-semibold text-[#526878] sm:flex"><span className="h-2 w-2 rounded-full bg-[#2F9A78]" />Northbank Civic Centre · live workspace</div>
          <BadgeCheck size={17} className="text-[#2F9A78]" aria-label="Secure workspace" />
        </div>
        <div className="relative aspect-[16/8.45] overflow-hidden rounded-b-[13px] bg-[#F4F7F8]">
          <Image src={dashboard} alt="BuildProof project command centre showing material, evidence, approval and release controls" fill priority placeholder="blur" className="object-cover object-top" sizes="(max-width: 1024px) 94vw, 760px" />
        </div>
      </div>

      <motion.div
        className="absolute -bottom-2 left-3 w-[47%] min-w-[168px] max-w-[235px] overflow-hidden rounded-[20px] border-[5px] border-[#102B43] bg-white shadow-[0_22px_48px_rgba(16,43,67,0.22)] sm:-bottom-7 sm:-left-6"
        animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex h-7 items-center justify-between bg-[#102B43] px-3 text-[11px] font-semibold text-white"><span>09:42</span><span>BuildProof field</span></div>
        <div className="relative aspect-[16/8.5] overflow-hidden bg-[#E3F5FB]"><Image src={siteEngineer} alt="Site engineer capturing field evidence" fill placeholder="blur" className="object-cover object-[center_34%]" sizes="235px" /><span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-md bg-white/95 px-2 py-1 text-[11px] font-bold text-[#102B43]"><MapPin size={11} />Grid B4</span></div>
        <div className="p-3">
          <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-[#102B43]">Delivery DN-184</p><span className="rounded-md bg-[#E8F6F1] px-2 py-1 text-[10px] font-bold text-[#24785F]">Linked</span></div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-semibold text-[#526878]"><span className="flex items-center gap-1.5"><Camera size={12} className="text-[#E96B2C]" />4 photos</span><span className="flex items-center gap-1.5"><ClipboardCheck size={12} className="text-[#2789B0]" />ITP 2.4</span></div>
          <div className="mt-3 flex items-center gap-2 border-t border-[#DCE7ED] pt-2.5 text-[10px] font-bold text-[#24785F]"><Check size={12} />Ready for review</div>
        </div>
      </motion.div>

      <div className="absolute -right-1 bottom-7 rounded-xl border border-[#DCE7ED] bg-white px-4 py-3 shadow-[0_14px_32px_rgba(16,43,67,0.13)] sm:-right-5 sm:bottom-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#617586]">Evidence completeness</p>
        <div className="mt-2 flex items-end gap-3"><strong className="font-heading text-2xl font-extrabold text-[#102B43]">78%</strong><span className="mb-1 text-xs font-bold text-[#2F9A78]">On track</span></div>
        <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-[#E5EDF1]"><motion.div className="h-full rounded-full bg-[#F4874B]" initial={reduceMotion ? { width: "78%" } : { width: 0 }} animate={{ width: "78%" }} transition={{ delay: 0.3, duration: 0.5 }} /></div>
      </div>
    </motion.div>
  );
}
