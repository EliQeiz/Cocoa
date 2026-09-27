'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, ChevronRight, Leaf, MapPinned, Menu, Play, ShieldCheck, Sprout, Warehouse } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const frames = [
  { src: '/images/cocoa-estate-sunrise.png', label: 'Western North · dawn harvest' },
  { src: '/images/cocoa-farm-hero.png', label: 'Ahafo · mapped cocoa estate' },
];

export function LandingPage() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setFrame((current) => (current + 1) % frames.length), 5500);
    return () => window.clearInterval(timer);
  }, []);
  return <main className="min-h-screen overflow-hidden bg-[#fbf8f1] text-[#24170f]">
    <nav className="relative z-20 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 lg:px-10">
      <Link href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#1f573c] text-[#fffdf8]"><Leaf size={19}/></span><span><span className="block text-base font-black tracking-[-.06em]">AuraFlow</span><span className="block text-[9px] font-bold uppercase tracking-[.22em] text-[#9a651a]">CocoaTrace</span></span></Link>
      <div className="hidden items-center gap-8 text-[12px] font-bold text-[#725e4c] md:flex"><a href="#platform" className="hover:text-[#1f573c]">Platform</a><a href="#proof" className="hover:text-[#1f573c]">Why traceability</a><a href="#operations" className="hover:text-[#1f573c]">Operations</a></div>
      <div className="flex items-center gap-3"><Link href="/auth" className="hidden text-xs font-bold text-[#4c3626] sm:block">Sign in</Link><Link href="/auth?mode=signup" className="inline-flex items-center gap-2 rounded-full bg-[#1f573c] px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-[#1f573c]/20 transition hover:bg-[#16432e]">Request access <ArrowRight size={14}/></Link><Menu className="md:hidden" size={20}/></div>
    </nav>

    <section className="relative mx-auto max-w-[1440px] px-5 pb-14 pt-4 lg:px-10 lg:pb-24 lg:pt-10">
      <div className="absolute right-0 top-12 -z-0 h-64 w-64 rounded-full bg-[#f5c653]/25 blur-3xl"/>
      <div className="relative grid items-end gap-10 lg:grid-cols-[.88fr_1.12fr]">
        <div className="relative z-10 max-w-xl pb-2 pt-8 lg:pt-16">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-[#d7c7a3] bg-[#fffdf8] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#806028]"><span className="h-1.5 w-1.5 rounded-full bg-[#e68a22]"/>Cocoa infrastructure, made credible</motion.div>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }} className="mt-6 font-serif text-[3.35rem] font-bold leading-[.91] tracking-[-.065em] text-[#27180f] sm:text-7xl">Good cocoa<br/>deserves <span className="text-[#397451]">good proof.</span></motion.h1>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .16 }} className="mt-6 max-w-lg text-[15px] leading-7 text-[#6b5a4c]">AuraFlow turns field records, farm boundaries and custody events into buyer-ready evidence—without asking field teams to work around unreliable connectivity.</motion.p>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .24 }} className="mt-8 flex flex-wrap gap-3"><Link href="/auth?mode=signup" className="inline-flex items-center gap-2 rounded-full bg-[#1f573c] px-5 py-3.5 text-xs font-black text-white shadow-xl shadow-[#1f573c]/20">Build a trusted supply chain <ArrowRight size={15}/></Link><a href="#platform" className="inline-flex items-center gap-2 rounded-full border border-[#cdbca4] bg-white px-5 py-3.5 text-xs font-black text-[#473426]"><Play size={14} fill="currentColor"/>Explore the platform</a></motion.div>
          <div className="mt-10 flex items-center gap-7 border-t border-[#e7ddce] pt-6"><div><p className="font-serif text-2xl font-bold">5k</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#887667]">tracked purchases</p></div><div className="h-9 w-px bg-[#dfd1bd]"/><div><p className="font-serif text-2xl font-bold">2,046</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#887667]">farm polygons</p></div><div className="h-9 w-px bg-[#dfd1bd]"/><div><p className="font-serif text-2xl font-bold">RLS</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#887667]">tenant security</p></div></div>
        </div>
        <div className="relative h-[510px] overflow-hidden rounded-[28px] bg-[#214d38] shadow-2xl shadow-[#4f321c]/25 sm:h-[610px]">
          <AnimatePresence mode="wait">{frames.map((item, index) => index === frame && <motion.div key={item.src} initial={{ opacity: 0, scale: 1.07 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.1 }} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(' + item.src + ')' }}/>)}</AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-[#1d291c]/90 via-[#1d291c]/10 to-transparent"/>
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 sm:p-7"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#f3d37e]">Field intelligence</p><p className="mt-2 max-w-sm font-serif text-2xl font-bold leading-tight text-white">Proof that starts where the cocoa does.</p></div><span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur">{frames[frame].label}</span></div>
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute right-5 top-5 rounded-2xl border border-white/20 bg-[#fffdf8]/95 p-3 shadow-lg backdrop-blur"><p className="text-[9px] font-black uppercase tracking-[.1em] text-[#8d6b2d]">EUDR readiness</p><p className="mt-1 font-serif text-2xl font-bold text-[#1f573c]">94.2%</p><div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-[#e6ddcf]"><div className="h-full w-[94%] rounded-full bg-[#e68a22]"/></div></motion.div>
        </div>
      </div>
    </section>

    <section id="platform" className="border-y border-[#e8dece] bg-[#f3eee4] py-20"><div className="mx-auto max-w-[1440px] px-5 lg:px-10"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#b66c19]">One operating fabric</p><h2 className="mt-3 max-w-xl font-serif text-4xl font-bold tracking-[-.05em]">Built around the hard parts of traceability.</h2></div><p className="max-w-sm text-sm leading-6 text-[#746456]">Not another reporting dashboard. A connected operational system for field teams, societies, warehouses and buyers.</p></div><div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-[#dfd2bd] bg-[#dfd2bd] md:grid-cols-3">{[[MapPinned,'Capture once','Offline farm registration and defensible polygon evidence.'],[ShieldCheck,'Resolve before export','Risk signals routed to the right person, at the right time.'],[Warehouse,'Protect every handoff','A clear, auditable chain from purchase to lot.']].map(([Icon,title,description])=>{const Mark=Icon as typeof MapPinned;return <article key={String(title)} className="bg-[#fbf8f1] p-7"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f0e4] text-[#267047]"><Mark size={19}/></span><h3 className="mt-6 text-lg font-black tracking-[-.04em]">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-[#756354]">{String(description)}</p><span className="mt-6 inline-flex items-center gap-1 text-xs font-black text-[#a75c17]">Explore workflow <ChevronRight size={14}/></span></article>})}</div></div></section>

    <section id="proof" className="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 lg:grid-cols-[.85fr_1.15fr] lg:px-10"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#b66c19]">Designed for trust</p><h2 className="mt-3 font-serif text-4xl font-bold tracking-[-.055em]">Evidence people can actually use.</h2><p className="mt-5 text-sm leading-7 text-[#756354]">Field reality is complex. Your operating system should make it legible, not make it harder.</p><Link href="/auth" className="mt-7 inline-flex items-center gap-2 text-xs font-black text-[#1f573c]">See your workspace <ArrowRight size={15}/></Link></div><div className="grid gap-3 sm:grid-cols-2">{['Designed for intermittent connectivity','Clear ownership of every exception','Buyer-ready evidence, not spreadsheets','Organization-level access controls'].map((item,index)=><motion.div whileHover={{ y: -3 }} key={item} className={index===0?'rounded-2xl bg-[#1f573c] p-6 text-white':'rounded-2xl border border-[#e0d3c1] p-6'}><span className={index===0?'text-[#f5c653]':'text-[#e68a22]'}><Check size={21}/></span><p className="mt-9 max-w-[180px] text-sm font-black leading-5">{item}</p></motion.div>)}</div></section>
    <footer className="bg-[#25170f] py-8 text-[#e9ddcd]"><div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 text-[11px] sm:flex-row sm:items-center sm:justify-between lg:px-10"><span className="font-bold">AuraFlow CocoaTrace</span><span className="text-[#b8a996]">Secure cocoa operations infrastructure · Ghana pilot 2026</span></div></footer>
  </main>;
}
