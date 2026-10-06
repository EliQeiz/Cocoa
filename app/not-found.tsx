import Link from "next/link";
import { ArrowLeft, MapPinned } from "lucide-react";
import { BuildProofBrand } from "./_components/buildproof-brand";

export default function NotFound() {
  return <main className="resilience-page">
    <section className="resilience-card">
      <BuildProofBrand />
      <span className="resilience-icon"><MapPinned /></span>
      <p className="section-kicker">404 · Record not found</p>
      <h1>This BuildProof location does not exist.</h1>
      <p>The link may be outdated, or the record may not be available to your tenant.</p>
      <Link className="primary-button" href="/workspace"><ArrowLeft size={17} /> Return to workspace</Link>
    </section>
  </main>;
}
