import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  FileArchive,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import materialTraceImage from "@/public/images/buildproof-material-trace-v1.png";
import projectImage from "@/public/images/buildproof-project-preview.png";
import siteMapImage from "@/public/images/buildproof-site-map.png";
import { BuildProofBrand } from "../buildproof-brand";
import { audiences, capabilities, evidenceChain, footerGroups, pilotSteps, problems, securityFeatures } from "./content";
import { EvidenceState, ProgressBar, RoleTabs, WorkflowExplorer } from "./interactive";
import { Reveal } from "./motion";
import { Button, Container, FeatureCard, IconChip, SectionHeader } from "./primitives";

export function AudienceStrip() {
  return (
    <section aria-labelledby="audience-heading" className="border-b border-[#DCE7ED] bg-[#FAFBFC] py-7">
      <Container>
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-between">
          <p id="audience-heading" className="shrink-0 text-sm font-bold uppercase tracking-[0.08em] text-[#617586]">Built for accountable project teams</p>
          <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 lg:justify-end">
            {audiences.map(({ label, icon: Icon }) => <span key={label} className="flex items-center gap-2 text-sm font-semibold text-[#294256]"><Icon size={17} strokeWidth={1.9} className="text-[#E96B2C]" />{label}</span>)}
          </div>
        </div>
      </Container>
    </section>
  );
}

const problemTone = {
  orange: { icon: "orange" as const, dot: "bg-[#F4874B]", bar: "w-[38%] bg-[#F4874B]" },
  sky: { icon: "sky" as const, dot: "bg-[#66C4E8]", bar: "w-[56%] bg-[#66C4E8]" },
  amber: { icon: "amber" as const, dot: "bg-[#E4A23A]", bar: "w-[72%] bg-[#E4A23A]" },
};

export function ProblemSection() {
  return (
    <section id="why" className="scroll-mt-24 bg-white py-20 lg:py-24">
      <Container>
        <Reveal><SectionHeader eyebrow="Why BuildProof" title="The work happens on site. Accountability is usually scattered." description="When evidence, delivery records and approvals are separated, project teams spend time reconstructing the basis for decisions instead of controlling the work." className="max-w-3xl" /></Reveal>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {problems.map((problem, index) => {
            const tone = problemTone[problem.tone];
            const Icon = problem.icon;
            return (
              <Reveal key={problem.title} delay={index * 0.06}>
                <FeatureCard className="h-full">
                  <div className="flex items-center justify-between"><IconChip icon={Icon} tone={tone.icon} /><span className="font-mono text-sm font-semibold text-[#91A4B3]">0{index + 1}</span></div>
                  <h3 className="mt-6 font-heading text-xl font-extrabold tracking-[-0.025em] text-[#102B43]">{problem.title}</h3>
                  <p className="mt-3 text-base leading-7 text-[#617586]">{problem.description}</p>
                  <div className="mt-6 rounded-xl border border-[#DCE7ED] bg-[#FAFBFC] p-3.5">
                    <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 font-semibold text-[#526878]"><span className={`h-2 w-2 rounded-full ${tone.dot}`} />{problem.indicator}</span><span className="text-[#91A4B3]">Needs control</span></div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E5EDF1]"><div className={`h-full rounded-full ${tone.bar}`} /></div>
                  </div>
                </FeatureCard>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

export function WorkflowSection() {
  return (
    <section id="workflow" className="scroll-mt-24 border-y border-[#DCE7ED] bg-[#F2FAFD] py-20 lg:py-24">
      <Container>
        <Reveal><SectionHeader eyebrow="The operating workflow" title="Four stages. One continuous project record." description="BuildProof mirrors the way responsible teams set requirements, capture work, close exceptions and prepare controlled releases." className="max-w-3xl" /></Reveal>
        <div className="mt-10"><WorkflowExplorer /></div>
      </Container>
    </section>
  );
}

function MaterialPreview() {
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_210px] sm:items-end">
      <div className="space-y-3">
        {[{ name: "Cement (C35)", state: "Verified", value: 84 }, { name: "Rebar (B500B)", state: "Verified", value: 92 }, { name: "Aggregates", state: "In review", value: 64 }].map((item) => <div key={item.name} className="rounded-xl border border-[#DCE7ED] bg-white p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-[#102B43]">{item.name}</span><span className={`text-xs font-bold ${item.state === 'Verified' ? 'text-[#24785F]' : 'text-[#A86D13]'}`}>{item.state}</span></div><div className="mt-2"><ProgressBar value={item.value} /></div></div>)}
      </div>
      <div className="relative hidden aspect-[4/3] overflow-hidden rounded-xl sm:block"><Image src={materialTraceImage} alt="Construction material records for traceability" fill placeholder="blur" className="object-cover" sizes="210px" /></div>
    </div>
  );
}

function SiteEvidencePreview() {
  return <div className="relative mt-5 aspect-[16/8] overflow-hidden rounded-xl border border-[#C8DCE6]"><Image src={siteMapImage} alt="Project site location linked to a BuildProof record" fill placeholder="blur" className="object-cover" sizes="(max-width: 1024px) 100vw, 440px" /><span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-lg bg-[#102B43]/90 px-3 py-2 text-xs font-bold text-white"><MapPin size={14} />Grid B4 · evidence linked</span></div>;
}

function MiniDecisionPreview({ kind }: { kind: "quality" | "exception" | "approval" }) {
  const rows = kind === "quality" ? [["Reinforcement check", true], ["Cube test · 7 day", true], ["Cube test · 28 day", false]] : kind === "exception" ? [["NCR-014", true], ["Missing certificate", false], ["Photo retake", true]] : [["Site engineer", true], ["QA/QC lead", true], ["Consultant", false]];
  return <div className="mt-5 divide-y divide-[#DCE7ED] rounded-xl border border-[#DCE7ED] bg-white">{rows.map(([label, complete]) => <div key={String(label)} className="flex items-center justify-between gap-3 px-3.5 py-3"><span className="text-sm font-semibold text-[#294256]">{label}</span><EvidenceState label={complete ? "Complete" : "Pending"} complete={Boolean(complete)} /></div>)}</div>;
}

export function CapabilitiesSection() {
  return (
    <section id="platform" className="scroll-mt-24 bg-white py-20 lg:py-24">
      <Container>
        <Reveal><SectionHeader eyebrow="Product capabilities" title="Control the evidence behind every critical decision." description="Each capability is part of the same project record, so teams can move from field activity to review without losing context." className="max-w-3xl" /></Reveal>
        <div className="mt-10 grid gap-5 lg:grid-cols-12">
          {capabilities.map((capability, index) => {
            const Icon = capability.icon;
            const isWide = capability.size === "wide";
            const span = index === 0 ? "lg:col-span-7" : index === 1 ? "lg:col-span-5" : index === 5 ? "lg:col-span-12" : "lg:col-span-4";
            return (
              <Reveal key={capability.title} className={span} delay={(index % 3) * 0.04}>
                <FeatureCard tone={capability.tone} className={`h-full ${isWide ? "min-h-[310px]" : "min-h-[280px]"}`}>
                  <div className={index === 5 ? "grid gap-7 md:grid-cols-[0.72fr_1.28fr] md:items-center" : ""}>
                    <div>
                      <IconChip icon={Icon} tone={capability.tone} />
                      <h3 className="mt-5 font-heading text-xl font-extrabold tracking-[-0.025em] text-[#102B43]">{capability.title}</h3>
                      <p className="mt-3 text-base leading-7 text-[#617586]">{capability.description}</p>
                      <p className="mt-4 flex items-center gap-2 text-sm font-bold text-[#294256]"><Check size={16} className="text-[#2F9A78]" />{capability.outcome}</p>
                    </div>
                    {index === 0 ? <div className="mt-6"><MaterialPreview /></div> : null}
                    {index === 1 ? <SiteEvidencePreview /> : null}
                    {index === 2 ? <MiniDecisionPreview kind="quality" /> : null}
                    {index === 3 ? <MiniDecisionPreview kind="exception" /> : null}
                    {index === 4 ? <MiniDecisionPreview kind="approval" /> : null}
                    {index === 5 ? <div className="rounded-xl border border-[#C8DCE6] bg-white p-4"><div className="flex items-center justify-between border-b border-[#DCE7ED] pb-3"><span className="text-sm font-bold text-[#102B43]">Release pack · Level 02</span><span className="rounded-md bg-[#E8F6F1] px-2.5 py-1 text-xs font-bold text-[#24785F]">Ready for review</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><EvidenceState label="Trace complete" /><EvidenceState label="Tests accepted" /><EvidenceState label="Approvals linked" /></div><div className="mt-4"><ProgressBar value={100} /></div></div> : null}
                  </div>
                </FeatureCard>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

export function EvidenceChainSection() {
  return (
    <section className="border-y border-[#DCE7ED] bg-[#FAFBFC] py-20 lg:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <Reveal><SectionHeader eyebrow="A complete evidence chain" title="From delivery to defensible release." description="A release decision is stronger when each stage points back to the requirement, evidence and responsible reviewer that supports it." /></Reveal>
          <Reveal delay={0.06} className="rounded-[20px] border border-[#DCE7ED] bg-white p-5 shadow-[0_14px_40px_rgba(16,43,67,0.07)] sm:p-6">
            <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-[#102B43]">C35 concrete · Batch #3287</p><p className="mt-1 text-sm text-[#617586]">Northbank Civic Centre · Level 02</p></div><span className="rounded-lg bg-[#E8F6F1] px-3 py-2 text-sm font-bold text-[#24785F]">Chain complete</span></div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#E5EDF1]"><div className="h-full w-full rounded-full bg-[#2F9A78]" /></div>
          </Reveal>
        </div>
        <div className="relative mt-9 grid gap-3 md:grid-cols-7">
          <div className="absolute left-[7%] right-[7%] top-6 hidden h-px bg-[#C8DCE6] md:block" aria-hidden="true" />
          {evidenceChain.map((item, index) => { const Icon = item.icon; return <Reveal key={item.label} delay={index * 0.035} className="relative z-10"><div className="flex h-full items-center gap-4 rounded-xl border border-[#DCE7ED] bg-white p-4 md:block md:min-h-[150px] md:text-center"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl md:mx-auto ${index === evidenceChain.length - 1 ? 'bg-[#102B43] text-white' : index === 4 ? 'bg-[#FFF6E6] text-[#A86D13]' : 'bg-[#E8F6F1] text-[#24785F]'}`}><Icon size={20} /></span><div><p className="text-sm font-bold text-[#102B43] md:mt-4">{item.label}</p><p className="mt-1 text-xs font-semibold text-[#617586]">{item.meta}</p></div></div></Reveal>; })}
        </div>
      </Container>
    </section>
  );
}

export function RolesSection() {
  return (
    <section id="teams" className="scroll-mt-24 bg-white py-20 lg:py-24">
      <Container>
        <Reveal><SectionHeader eyebrow="Built around responsibility" title="Each role sees the record it needs to act." description="BuildProof gives delivery, quality, commercial and owner teams a shared record without flattening their different responsibilities." className="max-w-3xl" /></Reveal>
        <div className="mt-10"><RoleTabs /></div>
      </Container>
    </section>
  );
}

export function SecuritySection() {
  return (
    <section id="security" className="scroll-mt-24 bg-[#102B43] py-20 text-white lg:py-24">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <span className="inline-flex rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-bold tracking-[0.05em] text-[#9DDCF0]">Security and governance</span>
            <h2 className="mt-5 max-w-xl font-heading text-[clamp(2rem,3.2vw,2.85rem)] font-extrabold leading-[1.1] tracking-[-0.035em]">Evidence is only useful when its custody is clear.</h2>
            <p className="mt-5 max-w-xl text-[17px] leading-7 text-[#C6D5DF]">BuildProof is designed to keep project records inside authorised boundaries and preserve the people, actions and approvals behind every controlled decision.</p>
            <div className="mt-8 flex items-center gap-3 border-l-2 border-[#F4874B] pl-4 text-sm font-semibold text-white"><ShieldCheck size={19} className="text-[#F4B48E]" />Governance follows the project record.</div>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {securityFeatures.map((feature, index) => { const Icon = feature.icon; return <Reveal key={feature.title} delay={index * 0.04} className={index === 4 ? "sm:col-span-2" : ""}><article className="flex h-full gap-4 rounded-[16px] border border-white/12 bg-white/[0.055] p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#173D5D] text-[#9DDCF0]"><Icon size={19} /></span><div><h3 className="font-heading text-base font-extrabold">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-[#B6C8D4]">{feature.description}</p></div></article></Reveal>; })}
          </div>
        </div>
      </Container>
    </section>
  );
}

export function PilotSection() {
  return (
    <section id="pilot" className="scroll-mt-24 bg-[#F2FAFD] py-20 lg:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <Reveal>
            <SectionHeader eyebrow="90-day design-partner pilot" title="Prove value on one live project." description="A BuildProof pilot begins with the current operating reality, configures one controlled workflow and measures the change with the project team." />
            <div className="mt-7 rounded-xl border border-[#C8DCE6] bg-white p-5">
              <p className="text-sm font-bold uppercase tracking-[0.07em] text-[#617586]">Measured throughout the pilot</p>
              <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-lg bg-[#E8F6F1] px-3 py-2 text-sm font-semibold text-[#24785F]">Evidence completeness</span><span className="rounded-lg bg-[#FFF6E6] px-3 py-2 text-sm font-semibold text-[#A86D13]">Exception resolution</span><span className="rounded-lg bg-[#E3F5FB] px-3 py-2 text-sm font-semibold text-[#245D78]">Release preparation</span></div>
            </div>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {pilotSteps.map((step, index) => <Reveal key={step.number} delay={index * 0.045}><article className="flex h-full gap-4 rounded-[16px] border border-[#DCE7ED] bg-white p-5"><span className="font-mono text-sm font-bold text-[#E96B2C]">{step.number}</span><div><h3 className="font-heading text-lg font-extrabold text-[#102B43]">{step.title}</h3><p className="mt-2 text-sm leading-6 text-[#617586]">{step.description}</p></div></article></Reveal>)}
          </div>
        </div>
      </Container>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="bg-white py-20 lg:py-24">
      <Container>
        <Reveal className="overflow-hidden rounded-[22px] border border-[#F4B48E] shadow-[0_20px_50px_rgba(16,43,67,0.09)]">
          <div className="grid lg:grid-cols-[0.32fr_0.68fr]">
            <div className="relative min-h-52 overflow-hidden bg-[#E96B2C] p-8 text-white lg:min-h-full">
              <Image src={projectImage} alt="Active construction project prepared for controlled delivery" fill placeholder="blur" className="object-cover opacity-20 mix-blend-multiply" sizes="(max-width: 1024px) 100vw, 420px" />
              <div className="relative z-10"><FileArchive size={34} /><p className="mt-16 max-w-xs font-heading text-2xl font-extrabold leading-tight">One project.<br />One accountable record.</p></div>
            </div>
            <div className="bg-white px-6 py-12 sm:px-10 lg:px-14 lg:py-14">
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-[#E96B2C]">Start with a live workflow</p>
              <h2 className="mt-4 max-w-3xl font-heading text-[clamp(2rem,3.1vw,2.8rem)] font-extrabold leading-[1.1] tracking-[-0.035em] text-[#102B43]">Turn site activity into accountable project evidence.</h2>
              <p className="mt-4 max-w-2xl text-[17px] leading-7 text-[#617586]">Discuss the project, evidence gap or release process you need to control. We will define a focused pilot around the work already happening.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button href="mailto:elishaafari0@gmail.com?subject=BuildProof%20pilot%20conversation" external size="large">Request a Pilot Conversation <ArrowRight size={18} /></Button><Button href="/auth" variant="secondary" size="large">Open BuildProof</Button></div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[#DCE7ED] bg-[#FAFBFC] pt-14">
      <Container>
        <div className="grid gap-10 pb-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
          <div><BuildProofBrand className="landing-brand" /><p className="mt-5 max-w-sm text-sm leading-6 text-[#617586]">Evidence-first construction control for accountable material, quality, approval and release decisions.</p><a href="mailto:elishaafari0@gmail.com" className="mt-4 inline-flex text-sm font-bold text-[#C9531F] hover:underline">elishaafari0@gmail.com</a></div>
          {footerGroups.map((group) => <div key={group.title}><h2 className="text-sm font-extrabold text-[#102B43]">{group.title}</h2><ul className="mt-4 space-y-3">{group.links.map((link) => <li key={link.label}>{link.href.startsWith('/') ? <Link href={link.href} className="rounded text-sm text-[#617586] transition hover:text-[#E96B2C] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#BFE8F7]">{link.label}</Link> : <a href={link.href} className="rounded text-sm text-[#617586] transition hover:text-[#E96B2C] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#BFE8F7]">{link.label}</a>}</li>)}</ul></div>)}
        </div>
        <div className="flex flex-col justify-between gap-4 border-t border-[#DCE7ED] py-6 text-sm text-[#617586] sm:flex-row"><span>© {new Date().getFullYear()} AuraFlow. BuildProof.</span><span className="flex items-center gap-2"><BadgeCheck size={16} className="text-[#2F9A78]" />Designed for controlled project evidence</span></div>
      </Container>
    </footer>
  );
}
