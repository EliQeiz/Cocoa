import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { AudienceStrip, CapabilitiesSection, EvidenceChainSection, FinalCta, Footer, PilotSection, ProblemSection, RolesSection, SecuritySection, WorkflowSection } from "./sections";

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white font-body text-slate-900 selection:bg-orange-100 selection:text-slate-950">
      <Navbar />
      <Hero />
      <AudienceStrip />
      <ProblemSection />
      <WorkflowSection />
      <CapabilitiesSection />
      <EvidenceChainSection />
      <RolesSection />
      <SecuritySection />
      <PilotSection />
      <FinalCta />
      <Footer />
    </main>
  );
}
