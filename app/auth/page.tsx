"use client";

import { ArrowRight, Building2, CheckCircle2, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

const callbackOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "https://cocoa-elisha-afaris-projects.vercel.app";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function continueFromSession() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: memberships } = await supabase
      .from("organization_memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);
    router.replace(memberships?.length ? "/workspace" : "/onboarding");
  }

  useEffect(() => {
    const callbackError = new URLSearchParams(window.location.search).get("error_description");
    if (callbackError) {
      setStatus("error");
      setMessage(callbackError.replaceAll("+", " "));
    }
    void continueFromSession();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void continueFromSession();
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${callbackOrigin}/auth`, shouldCreateUser: true },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
    setMessage("Your secure link is ready. Open the newest email on this device to continue.");
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
            <p className="auth-subtitle">Access your protected BuildProof workspace.</p>
            <form onSubmit={submit} className="auth-form">
              <label htmlFor="email">Email</label>
              <div className="input-with-icon"><Mail size={18} /><input id="email" type="email" autoComplete="email" required placeholder="name@organisation.org" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
              <button className="primary-button" disabled={status === "sending"}>{status === "sending" ? "Sending secure link…" : <>Continue <ArrowRight size={18} /></>}</button>
              {message && <p className={`form-message ${status === "error" ? "is-error" : ""}`}>{status === "sent" && <CheckCircle2 size={16} />}{message}</p>}
            </form>
            <div className="or-divider"><span />or<span /></div>
            <button className="provider-button" type="button" disabled><span className="provider-mark google">G</span> Continue with Google <small>Planned</small></button>
            <button className="provider-button" type="button" disabled><span className="provider-mark microsoft">▦</span> Continue with Microsoft <small>Planned</small></button>
            <p className="support-link"><Sparkles size={13} /> Need help signing in?</p>
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
