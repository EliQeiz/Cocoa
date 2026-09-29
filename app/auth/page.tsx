"use client";

import { ArrowRight, Building2, CheckCircle2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/workspace");
    });
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth`, shouldCreateUser: true },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
    setMessage("A secure sign-in link is on its way. Open it on this device to continue.");
  }

  return (
    <main className="auth-scene">
      <section className="auth-frame">
        <aside className="auth-story">
          <div className="brand"><Building2 size={25} strokeWidth={1.8} /><span>BuildProof</span><small>by AuraFlow</small></div>
          <div className="auth-story-copy">
            <span className="accent-rule" />
            <h1>Evidence builds what’s next.</h1>
            <p>Safer sites. Traceable materials. Stronger communities across Ghana.</p>
          </div>
          <div className="auth-story-footer">
            <span>Infrastructure</span><span>People</span><span>A stronger tomorrow</span>
          </div>
        </aside>

        <section className="auth-panel" aria-labelledby="sign-in-title">
          <div className="tenant-note"><span>Secure tenant space</span><LockKeyhole size={16} /></div>
          <div className="auth-form-wrap">
            <div className="eyebrow">Welcome back</div>
            <h2 id="sign-in-title">Sign in with your email</h2>
            <p className="auth-subtitle">We’ll send a secure link. No password to remember.</p>
            <form onSubmit={submit} className="auth-form">
              <label htmlFor="email">Email</label>
              <div className="input-with-icon"><Mail size={18} /><input id="email" type="email" autoComplete="email" required placeholder="name@organisation.org" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
              <button className="primary-button" disabled={status === "sending"}>{status === "sending" ? "Sending secure link…" : <>Continue <ArrowRight size={18} /></>}</button>
              {message && <p className={`form-message ${status === "error" ? "is-error" : ""}`}>{status === "sent" && <CheckCircle2 size={16} />}{message}</p>}
            </form>
            <div className="or-divider"><span />or<span /></div>
            <button className="provider-button" type="button" disabled>Continue with Google <span>Coming soon</span></button>
            <button className="provider-button" type="button" disabled>Continue with Microsoft <span>Coming soon</span></button>
            <p className="support-link">Need help signing in?</p>
          </div>
          <div className="trust-list">
            <span><LockKeyhole size={15} /> Passwordless access</span>
            <span><ShieldCheck size={15} /> Tenant-isolated data</span>
            <span><CheckCircle2 size={15} /> Enterprise-grade security</span>
          </div>
        </section>
      </section>
    </main>
  );
}
