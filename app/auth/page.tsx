"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { supabase } from "../../lib/supabase/client";
import { normalizeEmail, safeAuthError } from "../../lib/security/input";
import { AuthLayout } from "../_components/auth/auth-layout";

const configuredCallbackOrigin = process.env.NEXT_PUBLIC_APP_URL;
const emailSchema = z.object({ email: z.string().trim().email("Enter a valid work email address.").max(254) });
type EmailFields = z.infer<typeof emailSchema>;
type Status = "idle" | "sending" | "sent" | "verifying" | "error";

export default function AuthPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [view, setView] = useState<"email" | "otp">("email");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const acceptingInvite = useRef(false);
  const inviteToken = useRef("");
  const form = useForm<EmailFields>({ resolver: zodResolver(emailSchema), defaultValues: { email: "" }, mode: "onBlur" });
  const email = form.watch("email");

  const continueFromSession = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const token = inviteToken.current || new URLSearchParams(window.location.search).get("invite") || "";
    if (token && acceptingInvite.current) return;
    if (token) {
      acceptingInvite.current = true;
      const { error } = await supabase.rpc("accept_organization_invitation", { p_token: token });
      acceptingInvite.current = false;
      if (error) {
        setStatus("error");
        setMessage("This invitation is invalid, expired, or does not match the signed-in email address.");
        return;
      }
      inviteToken.current = "";
      window.history.replaceState({}, "", "/auth");
    }
    const { data: memberships } = await supabase.from("organization_memberships").select("id").eq("user_id", user.id).eq("status", "active").limit(1);
    router.replace(memberships?.length ? "/workspace" : "/onboarding");
  }, [router]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    inviteToken.current = query.get("invite") ?? "";
    if (query.get("mode") === "signup" || inviteToken.current) setMode("signup");
    const callbackError = query.get("error_description");
    if (callbackError) { setStatus("error"); setMessage(callbackError.replaceAll("+", " ")); }
    void continueFromSession();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => { if (event === "SIGNED_IN") void continueFromSession(); });
    return () => listener.subscription.unsubscribe();
  }, [continueFromSession]);

  useEffect(() => {
    if (!countdown) return;
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  async function sendLink(values: EmailFields) {
    setStatus("sending"); setMessage("");
    const normalizedEmail = normalizeEmail(values.email);
    const { error } = await supabase.auth.signInWithOtp({ email: normalizedEmail, options: { emailRedirectTo: `${configuredCallbackOrigin ?? window.location.origin}/auth${inviteToken.current ? `?invite=${encodeURIComponent(inviteToken.current)}` : ""}`, shouldCreateUser: mode === "signup" } });
    if (error) { setStatus("error"); setMessage(safeAuthError(error)); return; }
    setStatus("sent"); setView("otp"); setCountdown(45);
    setMessage("We sent a secure sign-in link and six-digit code to your email.");
  }

  async function verifyCode() {
    const token = otp.join("");
    if (token.length !== 6) { setStatus("error"); setMessage("Enter all six digits from the newest BuildProof email."); return; }
    setStatus("verifying"); setMessage("");
    const { error } = await supabase.auth.verifyOtp({ email: normalizeEmail(email), token, type: "email" });
    if (error) { setStatus("error"); setMessage(safeAuthError(error)); return; }
    setStatus("sent"); setMessage("Verified. Opening your secure workspace…");
    await continueFromSession();
  }

  async function continueWithProvider(provider: "google" | "azure") {
    setStatus("sending"); setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${configuredCallbackOrigin ?? window.location.origin}/auth${inviteToken.current ? `?invite=${encodeURIComponent(inviteToken.current)}` : ""}` } });
    if (error) { setStatus("error"); setMessage(safeAuthError(error)); }
  }

  function updateOtp(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtp((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item));
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  }

  const animation = reduceMotion ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.28 } };
  return (
    <AuthLayout>
      <motion.div {...animation}>
        <div className="mb-8 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><LockKeyhole size={17} className="text-orange-600" />Secure tenant space</span>
          {view === "otp" && <button type="button" onClick={() => { setView("email"); setStatus("idle"); setMessage(""); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-600 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"><ArrowLeft size={16} />Change email</button>}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {view === "email" ? <motion.div key="email" {...animation}>
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-orange-600">{mode === "signup" ? "Create your BuildProof account" : "Welcome to BuildProof"}</p>
            <h1 className="mt-3 font-heading text-[32px] font-bold tracking-[-0.02em] text-slate-950">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
            <p className="mt-2 text-base leading-7 text-slate-600">{mode === "signup" ? "Start with your work email. You’ll create your organisation next." : "Sign in with your work email to continue to your projects."}</p>
            <motion.form onSubmit={form.handleSubmit(sendLink)} className="mt-8 space-y-5" animate={status === "error" && !reduceMotion ? { x: [0, -5, 5, -3, 3, 0] } : undefined}>
              <div>
                <div className="relative">
                  <Mail aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input id="email" autoFocus type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" autoComplete="email" placeholder=" " {...form.register("email")} className="peer h-12 w-full rounded-xl border border-slate-300 bg-white px-11 pb-1 pt-4 text-[15px] text-slate-950 outline-none transition placeholder:text-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
                  <label htmlFor="email" className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-orange-600 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs">Work email</label>
                </div>
                {form.formState.errors.email && <p role="alert" className="mt-2 text-sm font-medium text-rose-700">{form.formState.errors.email.message}</p>}
              </div>
              <button type="submit" disabled={status === "sending"} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(249,115,22,.2)] transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:cursor-wait disabled:opacity-70">{status === "sending" ? <><LoaderCircle size={18} className="animate-spin" />Sending secure link…</> : <>Continue <ArrowRight size={17} /></>}</button>
            </motion.form>
            <StatusMessage status={status} message={message} />
            <div className="my-7 flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
            <div className="grid gap-3">
              <button type="button" onClick={() => void continueWithProvider("google")} className="flex h-12 items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100"><GoogleMark />Continue with Google</button>
              <button type="button" onClick={() => void continueWithProvider("azure")} className="flex h-12 items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100"><MicrosoftMark />Continue with Microsoft</button>
            </div>
            <div className="mt-8 flex flex-col items-center gap-4 text-sm">
              <a href="mailto:elishaafari0@gmail.com?subject=BuildProof%20sign-in%20support" className="font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-orange-600">Need help signing in?</a>
              <button type="button" onClick={() => { setMode((current) => current === "signin" ? "signup" : "signin"); setStatus("idle"); setMessage(""); }} className="min-h-11 rounded-lg px-3 font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100">{mode === "signin" ? "New to BuildProof? Create an organisation" : "Already have an account? Sign in"}</button>
            </div>
          </motion.div> : <motion.div key="otp" {...animation}>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={24} /></div>
            <h1 className="mt-5 font-heading text-[32px] font-bold tracking-[-0.02em] text-slate-950">Check your email</h1>
            <p className="mt-2 text-base leading-7 text-slate-600">Use the secure link we sent to <strong className="font-semibold text-slate-900">{normalizeEmail(email)}</strong>, or enter the six-digit code below.</p>
            <div className="mt-8 grid grid-cols-6 gap-2" role="group" aria-label="Six-digit verification code">
              {otp.map((digit, index) => <input key={index} ref={(element) => { otpRefs.current[index] = element; }} value={digit} onChange={(event) => updateOtp(index, event.target.value)} onKeyDown={(event) => { if (event.key === "Backspace" && !digit && index > 0) otpRefs.current[index - 1]?.focus(); }} onPaste={(event) => { const pasted=event.clipboardData.getData("text").replace(/\D/g,"").slice(0,6); if (pasted.length===6) { event.preventDefault(); setOtp(pasted.split("")); otpRefs.current[5]?.focus(); } }} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} aria-label={`Digit ${index + 1}`} className="h-14 min-w-0 rounded-xl border border-slate-300 text-center font-mono text-xl font-semibold tabular-nums text-slate-950 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />)}
            </div>
            <button type="button" onClick={() => void verifyCode()} disabled={status === "verifying"} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-bold text-white transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:opacity-70">{status === "verifying" ? <><LoaderCircle size={18} className="animate-spin" />Verifying…</> : <>Verify and continue <ArrowRight size={17} /></>}</button>
            <StatusMessage status={status} message={message} />
            <div className="mt-6 flex items-center justify-between gap-4 text-sm"><span className="text-slate-500">Didn’t receive it?</span><button type="button" disabled={countdown > 0} onClick={() => void form.handleSubmit(sendLink)()} className="min-h-11 font-semibold text-orange-600 disabled:text-slate-400">{countdown ? `Resend in ${countdown}s` : "Resend code"}</button></div>
          </motion.div>}
        </AnimatePresence>
        <footer className="mt-10 flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-slate-200 pt-6 text-sm text-slate-500"><Link href="/#security">Privacy</Link><Link href="/#security">Terms</Link><Link href="/api/health">Status</Link></footer>
      </motion.div>
    </AuthLayout>
  );
}

function StatusMessage({ status, message }: { status: Status; message: string }) {
  if (!message) return null;
  const error = status === "error";
  return <p role={error ? "alert" : "status"} aria-live="polite" className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium leading-6 ${error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error ? <LockKeyhole size={17} className="mt-0.5 shrink-0" /> : <Check size={17} className="mt-0.5 shrink-0" />}{message}</p>;
}

function GoogleMark() { return <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.22c0-.72-.06-1.22-.2-1.74H12v3.29h5.37c-.11.82-.73 2.05-2.11 2.88l-.02.11 3.07 2.38.21.02c1.93-1.78 2.83-4.4 2.83-7.02Z"/><path fill="#34A853" d="M12 21.72c2.63 0 4.83-.87 6.44-2.36l-3.07-2.4c-.82.57-1.92.98-3.37.98-2.58 0-4.77-1.7-5.55-4.05l-.1.01-3.2 2.47-.03.1A9.72 9.72 0 0 0 12 21.72Z"/><path fill="#FBBC05" d="M6.45 13.89A5.85 5.85 0 0 1 6.14 12c0-.66.12-1.3.3-1.89v-.12L3.21 7.48l-.1.05A9.7 9.7 0 0 0 2.28 12c0 1.61.39 3.14.83 4.47l3.34-2.58Z"/><path fill="#EA4335" d="M12 6.06c1.83 0 3.06.79 3.76 1.45l2.74-2.67C16.82 3.27 14.63 2.28 12 2.28a9.72 9.72 0 0 0-8.89 5.25l3.33 2.58C7.23 7.76 9.42 6.06 12 6.06Z"/></svg>; }
function MicrosoftMark() { return <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="#F25022" d="M2 2h9.5v9.5H2z"/><path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z"/><path fill="#00A4EF" d="M2 12.5h9.5V22H2z"/><path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z"/></svg>; }
