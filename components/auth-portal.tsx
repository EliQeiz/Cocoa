'use client';

import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, Eye, EyeOff, KeyRound, Leaf, LockKeyhole, Mail, MapPinned, ShieldCheck, Sparkles, Wifi } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

type Mode = 'login' | 'signup';

export function AuthPortal() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError('');
    setMessage('');
    if (mode === 'login') {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) setError(loginError.message);
      else router.push('/');
    } else {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
      });
      if (signupError) setError(signupError.message);
      else if (data.session) router.push('/');
      else setMessage('Account created. Check your inbox to confirm your email, then return here to sign in.');
    }
    setBusy(false);
  }

  async function sendMagicLink() {
    if (!supabase || !email) {
      setError('Enter your email address first.');
      return;
    }
    setBusy(true);
    setError('');
    const { error: magicError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (magicError) setError(magicError.message);
    else setMessage('A secure sign-in link is on its way to your inbox.');
  }

  const isLogin = mode === 'login';
  return <main className="min-h-screen overflow-hidden bg-[#07111d] text-slate-100">
    <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(circle at 16% 12%, rgba(45, 172, 115, .2), transparent 28%), radial-gradient(circle at 83% 17%, rgba(48, 116, 255, .22), transparent 26%), linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)', backgroundSize: 'auto, auto, 42px 42px, 42px 42px' }}/>
    <div className="relative mx-auto grid min-h-screen max-w-[1540px] lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden border-r border-white/10 p-9 lg:flex lg:flex-col xl:p-14">
        <Link href="/" className="inline-flex items-center gap-3 self-start"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 to-emerald-700 text-white shadow-xl shadow-emerald-950/40"><Leaf size={22}/></span><span><span className="block text-lg font-black tracking-[-.06em]">AuraFlow</span><span className="block text-[10px] font-bold uppercase tracking-[.2em] text-emerald-300">AgriTrace</span></span></Link>
        <div className="my-auto max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-bold text-emerald-200"><Sparkles size={14}/>Trusted cocoa traceability</span>
          <h1 className="mt-7 text-5xl font-black leading-[.98] tracking-[-.07em] text-white xl:text-6xl">Every bag has a story.<br/><span className="text-emerald-300">Make it verifiable.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">A resilient operating system for the people safeguarding Ghana’s cocoa supply chain—from field boundary to buyer-ready evidence.</p>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[['2,046','mapped farms',MapPinned],['5,000','pilot purchases',BadgeCheck],['RLS','tenant protected',ShieldCheck]].map(([value,label,Icon]) => { const Mark = Icon as typeof MapPinned; return <div key={String(value)} className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><Mark size={18} className="text-emerald-300"/><p className="mt-4 text-xl font-black text-white">{String(value)}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[.1em] text-slate-500">{String(label)}</p></div>; })}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500"><Wifi size={14} className="text-emerald-400"/>Offline-ready field workflows · EUDR evidence at every handoff</div>
      </section>

      <section className="flex min-h-screen items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-[480px] rounded-[28px] border border-white/10 bg-[#101d2c]/90 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
          <div className="flex items-center justify-between"><Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"><ArrowLeft size={15}/>Back to workspace</Link><span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-300"><LockKeyhole size={13}/>SECURED ACCESS</span></div>
          <div className="mt-9"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#3276ff] to-[#214da9] text-white shadow-lg shadow-blue-950/40"><KeyRound size={21}/></div><h2 className="mt-5 text-3xl font-black tracking-[-.055em] text-white">{isLogin ? 'Welcome back.' : 'Join the command centre.'}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{isLogin ? 'Sign in to your organization’s protected traceability workspace.' : 'Create an account with an invited organization email to access your workspace.'}</p></div>
          <div className="mt-7 grid grid-cols-2 rounded-xl bg-white/[.055] p-1"><button onClick={() => { setMode('login'); setError(''); setMessage(''); }} className={isLogin ? 'rounded-lg bg-[#286cff] px-3 py-2.5 text-xs font-black text-white shadow' : 'rounded-lg px-3 py-2.5 text-xs font-bold text-slate-400 hover:text-white'}>Sign in</button><button onClick={() => { setMode('signup'); setError(''); setMessage(''); }} className={!isLogin ? 'rounded-lg bg-[#286cff] px-3 py-2.5 text-xs font-black text-white shadow' : 'rounded-lg px-3 py-2.5 text-xs font-bold text-slate-400 hover:text-white'}>Create account</button></div>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {!isLogin && <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-300">Full name</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="h-12 w-full rounded-xl border border-white/10 bg-[#091522] px-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"/></label>}
            <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-300">Work email</span><span className="relative block"><Mail size={17} className="absolute left-3.5 top-3.5 text-slate-500"/><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@organization.org" className="h-12 w-full rounded-xl border border-white/10 bg-[#091522] pl-10 pr-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"/></span></label>
            <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-300">Password</span><span className="relative block"><LockKeyhole size={17} className="absolute left-3.5 top-3.5 text-slate-500"/><input required minLength={6} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" className="h-12 w-full rounded-xl border border-white/10 bg-[#091522] pl-10 pr-11 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"/><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-3 text-slate-500 hover:text-white">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
            {!isLogin && <p className="flex gap-2 text-[10px] leading-4 text-slate-500"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400"/>Creating an account does not grant tenant data by itself. An active email invitation is required.</p>}
            {error && <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-xs text-rose-200">{error}</p>}
            {message && <p role="status" className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-xs text-emerald-100">{message}</p>}
            {!isSupabaseConfigured && <p role="alert" className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2.5 text-xs text-amber-100">Supabase configuration is not loaded. Restart the application after adding public environment variables.</p>}
            <button disabled={busy || !isSupabaseConfigured} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3276ff] to-[#2462df] text-sm font-black text-white shadow-lg shadow-blue-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Please wait…' : isLogin ? 'Sign in securely' : 'Create secure account'}<ArrowRight size={17}/></button>
          </form>
          {isLogin && <button onClick={sendMagicLink} disabled={busy || !isSupabaseConfigured} className="mt-4 w-full text-center text-xs font-bold text-sky-300 hover:text-sky-200 disabled:opacity-50">Prefer passwordless? Email me a secure link</button>}
          <p className="mt-7 border-t border-white/10 pt-5 text-center text-[10px] leading-5 text-slate-500">Protected by Supabase Authentication and organization-level Row Level Security.</p>
        </div>
      </section>
    </div>
  </main>;
}
