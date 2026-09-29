"use client";

import { ArrowRight, Building2, CheckCircle2, Database, KeyRound, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

const callbackOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "https://cocoa-elisha-afaris-projects.vercel.app";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
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
      options: { emailRedirectTo: `${callbackOrigin}/auth`, shouldCreateUser: mode === "signup" },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
    setMessage(mode === "signup" ? "Your account link is ready. Open the newest email on this device to create your secure workspace." : "Your secure link is ready. Open the newest email on this device to continue.");
  }

  async function continueWithProvider(provider: "google" | "azure") {
    const providerName = provider === "google" ? "Google" : "Microsoft";
    setStatus("error");
    setMessage(`${providerName} sign-in is not configured for this workspace yet. An administrator must add its OAuth client credentials in Supabase before it can be used.`);
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
            <span><LockKeyhole size={16} /> Secure tenant space</span>
            <span><KeyRound size={16} /> Passwordless access</span>
            <span><Database size={16} /> Tenant-isolated data</span>
            <span><ShieldCheck size={16} /> Enterprise-grade security</span>
          </div>
        </aside>

        <section className="auth-panel" aria-labelledby="sign-in-title">
          <div className="auth-panel-header">
            <div className="brand auth-panel-brand"><Building2 size={25} strokeWidth={1.8} /><span>BuildProof</span><small>by AuraFlow</small></div>
            <div className="tenant-note"><span>Secure tenant space</span><LockKeyhole size={16} /></div>
          </div>
          <div className="auth-form-wrap">
            <div className="eyebrow">{mode === "signup" ? "Create your account" : "Welcome back"}</div>
            <h2 id="sign-in-title">{mode === "signup" ? "Start with your work email" : "Sign in with your email"}</h2>
            <p className="auth-subtitle">Access your protected BuildProof workspace.</p>
            <form onSubmit={submit} className="auth-form">
              <label htmlFor="email">{mode === "signup" ? "Work email" : "Email"}</label>
              <div className="input-with-icon"><Mail size={18} /><input id="email" type="email" autoComplete="email" required placeholder="name@organisation.org" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
              <button className="primary-button" disabled={status === "sending"}>{status === "sending" ? "Sending secure link…" : <>{mode === "signup" ? "Create secure account" : "Continue"} <ArrowRight size={18} /></>}</button>
              {message && <p className={`form-message ${status === "error" ? "is-error" : ""}`}>{status === "sent" && <CheckCircle2 size={16} />}{message}</p>}
            </form>
            <div className="or-divider"><span />or<span /></div>
            <button className="provider-button" type="button" onClick={() => void continueWithProvider("google")}><GoogleMark /> Continue with Google</button>
            <button className="provider-button" type="button" onClick={() => void continueWithProvider("azure")}><MicrosoftMark /> Continue with Microsoft</button>
            <p className="support-link"><Sparkles size={13} /> Need help signing in?</p>
            {mode === "signin" ? <button className="create-organisation-link" type="button" onClick={() => { setMode("signup"); setStatus("idle"); setMessage(""); document.getElementById("email")?.focus(); }}>New to BuildProof?<span>Create an organisation <ArrowRight size={16} /></span></button> : <button className="create-organisation-link" type="button" onClick={() => { setMode("signin"); setStatus("idle"); setMessage(""); }}>Already have an account?<span>Sign in <ArrowRight size={16} /></span></button>}
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

function GoogleMark() {
  return <svg className="provider-logo google-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.22c0-.72-.06-1.22-.2-1.74H12v3.29h5.37c-.11.82-.73 2.05-2.11 2.88l-.02.11 3.07 2.38.21.02c1.93-1.78 2.83-4.4 2.83-7.02Z"/><path fill="#34A853" d="M12 21.72c2.63 0 4.83-.87 6.44-2.36l-3.07-2.4c-.82.57-1.92.98-3.37.98-2.58 0-4.77-1.7-5.55-4.05l-.1.01-3.2 2.47-.03.1A9.72 9.72 0 0 0 12 21.72Z"/><path fill="#FBBC05" d="M6.45 13.89A5.85 5.85 0 0 1 6.14 12c0-.66.12-1.3.3-1.89v-.12L3.21 7.48l-.1.05A9.7 9.7 0 0 0 2.28 12c0 1.61.39 3.14.83 4.47l3.34-2.58Z"/><path fill="#EA4335" d="M12 6.06c1.83 0 3.06.79 3.76 1.45l2.74-2.67C16.82 3.27 14.63 2.28 12 2.28a9.72 9.72 0 0 0-8.89 5.25l3.33 2.58C7.23 7.76 9.42 6.06 12 6.06Z"/></svg>;
}

function MicrosoftMark() {
  return <svg className="provider-logo microsoft-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#F25022" d="M2 2h9.5v9.5H2z"/><path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z"/><path fill="#00A4EF" d="M2 12.5h9.5V22H2z"/><path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z"/></svg>;
}
