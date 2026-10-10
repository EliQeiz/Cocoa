"use client";

import Image, { type StaticImageData } from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Check, ChevronRight, CircleDot, Clock3, FileCheck2, MapPin, UserRound } from "lucide-react";
import { useState } from "react";
import materialTrace from "@/public/images/buildproof-material-trace-v1.png";
import projectPreview from "@/public/images/buildproof-project-preview.png";
import siteEngineer from "@/public/images/buildproof-site-engineer.png";
import siteMap from "@/public/images/buildproof-site-map.png";
import { roles, workflowStages } from "./content";

const workflowImages: readonly StaticImageData[] = [projectPreview, siteEngineer, materialTrace, siteMap];

function WorkflowPanel({ index }: { index: number }) {
  const stage = workflowStages[index];
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stage.number}
        id={`workflow-panel-${index}`}
        role="tabpanel"
        aria-labelledby={`workflow-tab-${index}`}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden rounded-[20px] border border-[#DCE7ED] bg-white shadow-[0_18px_48px_rgba(16,43,67,0.08)]"
      >
        <div className="flex items-center justify-between border-b border-[#DCE7ED] bg-[#FAFBFC] px-5 py-3">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-[#102B43]"><span className="h-2.5 w-2.5 rounded-full bg-[#2F9A78]" />Illustrative project record</div>
          <span className="text-sm font-medium text-[#617586]">Stage {stage.number}</span>
        </div>
        <div className="grid lg:grid-cols-[1fr_240px]">
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#E96B2C]">{stage.status}</p>
                <h3 className="mt-2 font-heading text-[clamp(1.35rem,2.2vw,1.8rem)] font-extrabold tracking-[-0.025em] text-[#102B43]">{stage.panelTitle}</h3>
                <p className="mt-2 flex items-center gap-2 text-sm text-[#617586]"><MapPin size={15} />{stage.panelMeta}</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-lg bg-[#E8F6F1] px-3 py-2 text-sm font-bold text-[#24785F]"><BadgeCheck size={16} />Controlled</span>
            </div>
            <div className="mt-7 divide-y divide-[#DCE7ED] border-y border-[#DCE7ED]">
              {stage.evidence.map((item, itemIndex) => (
                <div key={item} className="flex items-center justify-between gap-4 py-3.5">
                  <span className="flex items-center gap-3 text-sm font-medium text-[#294256]"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E3F5FB] text-[#2789B0]"><Check size={15} strokeWidth={2.5} /></span>{item}</span>
                  <span className="hidden text-sm text-[#617586] sm:inline">{itemIndex === 2 ? "Reviewed" : "Recorded"}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#617586]"><span className="flex items-center gap-2"><UserRound size={15} />Jordan Lee</span><span className="flex items-center gap-2"><Clock3 size={15} />Updated 2 hours ago</span></div>
          </div>
          <div className="relative min-h-52 border-t border-[#DCE7ED] lg:border-l lg:border-t-0">
            <Image src={workflowImages[index]} alt={`${stage.title} project evidence example`} fill placeholder="blur" className="object-cover" sizes="(max-width: 1024px) 100vw, 240px" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#102B43]/55 via-transparent to-transparent" />
            <p className="absolute bottom-4 left-4 right-4 text-sm font-semibold text-white">{stage.short}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function WorkflowExplorer() {
  const [active, setActive] = useState(0);

  return (
    <>
      <div className="hidden md:block">
        <div className="relative grid grid-cols-4 gap-3" role="tablist" aria-label="BuildProof workflow stages">
          <div className="absolute left-[10%] right-[10%] top-7 h-px bg-[#C8DCE6]" aria-hidden="true" />
          {workflowStages.map((stage, index) => {
            const Icon = stage.icon;
            const selected = active === index;
            return (
              <button
                id={`workflow-tab-${index}`}
                key={stage.number}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`workflow-panel-${index}`}
                onClick={() => setActive(index)}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                className={`relative z-10 rounded-2xl border p-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#BFE8F7] ${selected ? "border-[#F4B48E] bg-white shadow-[0_10px_30px_rgba(16,43,67,0.08)]" : "border-transparent bg-[#F5FAFC] hover:border-[#C8DCE6] hover:bg-white"}`}
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${selected ? "bg-[#FFF0E7] text-[#E96B2C]" : "bg-white text-[#617586]"}`}><Icon size={20} strokeWidth={1.9} /></span>
                <span className="mt-5 block text-sm font-bold text-[#102B43]">{stage.number} · {stage.title}</span>
                <span className="mt-1.5 block text-sm leading-5 text-[#617586]">{stage.short}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-6"><WorkflowPanel index={active} /></div>
      </div>

      <div className="grid gap-4 md:hidden">
        {workflowStages.map((stage) => {
          const Icon = stage.icon;
          return (
            <article key={stage.number} className="overflow-hidden rounded-2xl border border-[#DCE7ED] bg-white">
              <div className="flex items-start gap-4 p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E7] text-[#E96B2C]"><Icon size={20} /></span>
                <div><p className="text-sm font-bold text-[#E96B2C]">{stage.number}</p><h3 className="mt-1 font-heading text-xl font-extrabold text-[#102B43]">{stage.title}</h3><p className="mt-2 text-base leading-7 text-[#617586]">{stage.description}</p></div>
              </div>
              <div className="border-t border-[#DCE7ED] bg-[#F8FBFC] p-5"><p className="text-sm font-bold text-[#102B43]">{stage.panelTitle}</p><p className="mt-1 text-sm text-[#617586]">{stage.status} · {stage.evidence.length} records linked</p></div>
            </article>
          );
        })}
      </div>
    </>
  );
}

function RolePreview({ roleIndex }: { roleIndex: number }) {
  const role = roles[roleIndex];
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={role.id} initial={reduceMotion ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: -10 }} transition={{ duration: 0.26 }} className="rounded-[18px] border border-[#DCE7ED] bg-white shadow-[0_16px_40px_rgba(16,43,67,0.08)]">
        <div className="flex items-center justify-between border-b border-[#DCE7ED] px-5 py-4"><span className="text-sm font-bold text-[#102B43]">{role.previewTitle}</span><span className="flex items-center gap-2 text-sm font-semibold text-[#2F9A78]"><span className="h-2 w-2 rounded-full bg-[#2F9A78]" />Live project</span></div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-3">
            {[['Evidence', roleIndex === 1 ? '18' : '438'], ['Open actions', roleIndex === 3 ? '2' : '3'], ['Pending', roleIndex === 2 ? '4' : '7']].map(([label, value], index) => <div key={label} className="rounded-xl border border-[#DCE7ED] bg-[#FAFBFC] p-3"><p className={`font-heading text-2xl font-extrabold ${index === 1 ? 'text-[#E4A23A]' : 'text-[#102B43]'}`}>{value}</p><p className="mt-1 text-sm text-[#617586]">{label}</p></div>)}
          </div>
          <div className="mt-4 divide-y divide-[#DCE7ED] rounded-xl border border-[#DCE7ED]">
            {role.sees.map((item, index) => <div key={item} className="flex items-center justify-between gap-3 px-4 py-3.5"><span className="flex items-center gap-3 text-sm font-medium text-[#294256]"><span className={`h-2.5 w-2.5 rounded-full ${index === 1 ? 'bg-[#E4A23A]' : 'bg-[#2F9A78]'}`} />{item}</span><ChevronRight size={16} className="text-[#91A4B3]" /></div>)}
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#E3F5FB] px-4 py-3 text-sm font-semibold text-[#245D78]"><FileCheck2 size={18} />Workspace view follows assigned authority</div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function RoleTabs() {
  const [active, setActive] = useState(0);
  const role = roles[active];

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <div className="min-w-0">
        <div className="flex w-full gap-2 overflow-x-auto pb-2 lg:grid lg:grid-cols-2" role="tablist" aria-label="Role-based BuildProof views">
          {roles.map((item, index) => {
            const Icon = item.icon;
            const selected = active === index;
            return <button id={`role-tab-${index}`} key={item.id} type="button" role="tab" aria-selected={selected} aria-controls="role-panel" onClick={() => setActive(index)} className={`flex min-w-max items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#BFE8F7] lg:min-w-0 ${selected ? 'border-[#F4B48E] bg-[#FFF7F2] text-[#C9531F]' : 'border-[#DCE7ED] bg-white text-[#526878] hover:border-[#9FCFE1]'}`}><Icon size={17} />{item.label}</button>;
          })}
        </div>
        <div id="role-panel" role="tabpanel" aria-labelledby={`role-tab-${active}`} className="mt-6">
          <p className="text-lg leading-8 text-[#294256]">{role.summary}</p>
          <dl className="mt-7 space-y-4">
            <div className="border-l-2 border-[#F4874B] pl-4"><dt className="text-sm font-bold uppercase tracking-[0.07em] text-[#617586]">Records</dt><dd className="mt-1 text-base font-semibold text-[#102B43]">{role.records}</dd></div>
            <div className="border-l-2 border-[#66C4E8] pl-4"><dt className="text-sm font-bold uppercase tracking-[0.07em] text-[#617586]">Approves</dt><dd className="mt-1 text-base font-semibold text-[#102B43]">{role.approves}</dd></div>
          </dl>
        </div>
      </div>
      <div className="min-w-0"><RolePreview roleIndex={active} /></div>
    </div>
  );
}

export function PulsingStatus() {
  const reduceMotion = useReducedMotion();
  return <motion.span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#2F9A78]" animate={reduceMotion ? undefined : { boxShadow: ["0 0 0 0 rgba(47,154,120,0.2)", "0 0 0 7px rgba(47,154,120,0)"] }} transition={{ duration: 1.8, repeat: Infinity }} />;
}

export function ProgressBar({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  return <div className="h-1.5 overflow-hidden rounded-full bg-[#E5EDF1]"><motion.div className="h-full rounded-full bg-[#F4874B]" initial={reduceMotion ? { width: `${value}%` } : { width: 0 }} whileInView={{ width: `${value}%` }} viewport={{ once: true }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} /></div>;
}

export function EvidenceState({ label, complete = true }: { label: string; complete?: boolean }) {
  return <span className={`inline-flex items-center gap-2 text-sm font-semibold ${complete ? 'text-[#24785F]' : 'text-[#A86D13]'}`}>{complete ? <Check size={15} /> : <CircleDot size={15} />}{label}</span>;
}
