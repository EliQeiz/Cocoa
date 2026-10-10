import { ArrowRight, Check } from "lucide-react";
import { Button, Container, Eyebrow } from "./primitives";
import { HeroProductPreview, Reveal } from "./motion";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-[#DCE7ED] bg-white py-16 sm:py-20 lg:py-24">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(rgba(102,196,232,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(102,196,232,0.055)_1px,transparent_1px)] bg-[size:42px_42px]" aria-hidden="true" />
      <div className="absolute right-0 top-0 -z-10 h-full w-[48%] bg-[#F1FAFD] [clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]" aria-hidden="true" />

      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-[0.84fr_1.16fr] lg:gap-14">
          <Reveal>
            <Eyebrow>Evidence-first construction control</Eyebrow>
            <h1 className="max-w-[680px] font-heading text-[clamp(3rem,5.4vw,4.35rem)] font-extrabold leading-[1.02] tracking-[-0.045em] text-[#102B43]">
              Project certainty,<br />built on <span className="text-[#E96B2C]">proof.</span>
            </h1>
            <p className="mt-6 max-w-[620px] text-[18px] leading-8 text-[#526878]">BuildProof connects material deliveries, site evidence, quality tests and professional approvals in one accountable project record—so every acceptance and release decision has a defensible basis.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="#pilot" size="large">Discuss a Live Project <ArrowRight size={18} /></Button>
              <Button href="#workflow" variant="secondary" size="large">See the Workflow</Button>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-[#526878]" aria-label="Pilot reassurance">
              {["One live project", "90-day pilot", "Measured outcome"].map((item) => <li key={item} className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#E8F6F1] text-[#24785F]"><Check size={14} strokeWidth={2.5} /></span>{item}</li>)}
            </ul>
          </Reveal>

          <HeroProductPreview />
        </div>
      </Container>
    </section>
  );
}
