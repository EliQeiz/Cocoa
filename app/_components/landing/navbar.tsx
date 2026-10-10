"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BuildProofBrand } from "../buildproof-brand";
import { navigation } from "./content";
import { Button, Container } from "./primitives";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 28);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className="relative z-[60] bg-[#E3F5FB] px-5 py-2 text-center text-sm font-semibold text-[#294256]">Applications are open for a limited number of 90-day BuildProof project pilots.</div>
      <header className={`sticky top-0 z-50 border-b border-[#DCE7ED] bg-white/95 backdrop-blur-lg transition-shadow duration-200 ${condensed ? "shadow-[0_7px_24px_rgba(16,43,67,0.08)]" : ""}`}>
        <Container className="flex h-[68px] items-center justify-between">
          <motion.div animate={reduceMotion ? undefined : { scale: condensed ? 0.94 : 1 }} transition={{ duration: 0.2 }} className="origin-left">
            <Link href="/" aria-label="BuildProof home" className="rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200"><BuildProofBrand compact className="landing-brand" /></Link>
          </motion.div>

          <nav className="hidden items-center gap-5 xl:flex" aria-label="Main navigation">
            {navigation.map((item) => <a key={item.label} href={item.href} className="rounded-md px-1 py-2 text-sm font-semibold text-[#526878] transition hover:text-[#E96B2C] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#BFE8F7]">{item.label}</a>)}
          </nav>

          <div className="hidden items-center gap-2 xl:flex">
            <Button href="/auth" variant="ghost" size="compact">Sign in</Button>
            <Button href="#pilot" size="compact">Request a pilot <ArrowRight size={16} /></Button>
          </div>

          <button type="button" onClick={() => setMenuOpen((open) => !open)} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#DCE7ED] bg-white text-[#102B43] transition hover:border-[#66C4E8] hover:bg-[#F3FBFD] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#BFE8F7] xl:hidden" aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? "Close navigation" : "Open navigation"}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </Container>

        <AnimatePresence initial={false}>
          {menuOpen ? (
            <motion.nav id="mobile-navigation" aria-label="Mobile navigation" className="overflow-hidden border-t border-[#DCE7ED] bg-white xl:hidden" initial={reduceMotion ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
              <Container className="grid gap-1 py-5">
                {navigation.map((item) => <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-base font-semibold text-[#294256] transition hover:bg-[#F3FBFD] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#BFE8F7]">{item.label}</a>)}
                <div className="mt-3 grid grid-cols-2 gap-3"><Button href="/auth" variant="secondary">Sign in</Button><Button href="#pilot">Request a pilot</Button></div>
              </Container>
            </motion.nav>
          ) : null}
        </AnimatePresence>
      </header>
    </>
  );
}
