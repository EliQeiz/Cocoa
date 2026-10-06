"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { BuildProofBrand } from "./_components/buildproof-brand";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="resilience-page">
    <section className="resilience-card" role="alert">
      <BuildProofBrand />
      <span className="resilience-icon"><AlertTriangle /></span>
      <p className="section-kicker">Workspace recovery</p>
      <h1>BuildProof couldn’t load this view.</h1>
      <p>Your data has not been changed. Retry the request; if it continues, share the reference below with your workspace administrator.</p>
      {error.digest && <code>Reference: {error.digest}</code>}
      <button className="primary-button" onClick={reset}><RotateCcw size={17} /> Retry safely</button>
    </section>
  </main>;
}
