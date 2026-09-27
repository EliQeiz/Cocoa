'use client';

import { LogIn, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

export function AccountAccess({
  email,
  organizationName,
  onRefresh,
}: {
  email?: string;
  organizationName?: string;
  onRefresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOtp({
      email: address.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    setMessage(error ? error.message : 'Check your inbox for the secure sign-in link.');
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    await onRefresh();
  }

  if (email) {
    return <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[.08] px-3 py-2 text-[11px] text-emerald-100">
      <ShieldCheck size={15} className="text-emerald-400"/>
      <span className="font-bold">Live tenant access</span>
      <span className="text-emerald-200/70">{organizationName || email}</span>
      <button onClick={onRefresh} className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 font-bold text-emerald-200 hover:bg-emerald-300/10"><RefreshCw size={13}/>Refresh</button>
      <button onClick={signOut} className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-bold text-emerald-200 hover:bg-emerald-300/10"><LogOut size={13}/>Sign out</button>
    </div>;
  }

  return <section className="rounded-xl border border-sky-400/20 bg-[#122032] px-4 py-3 sm:flex sm:items-center sm:justify-between">
    <div><p className="text-xs font-black text-white">Demo workspace</p><p className="mt-1 text-[11px] text-slate-400">Sign in with an invited email to load your organization’s secured Supabase data.</p></div>
    <button onClick={() => setOpen((value) => !value)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#2b74ff] px-3 py-2 text-xs font-black text-white sm:mt-0"><LogIn size={15}/>Sign in</button>
    {open && <form onSubmit={sendMagicLink} className="mt-3 flex w-full flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center">
      <input aria-label="Email address" required type="email" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="you@organization.org" className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0d1622] px-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-sky-400"/>
      <button disabled={busy || !isSupabaseConfigured} className="h-10 rounded-lg bg-emerald-500 px-4 text-xs font-black text-slate-950 disabled:opacity-50">{busy ? 'Sending…' : 'Email me a secure link'}</button>
      {!isSupabaseConfigured && <p className="text-[10px] text-amber-300">Add the public Supabase environment values first.</p>}
      {message && <p role="status" className="text-[11px] text-sky-200">{message}</p>}
    </form>}
  </section>;
}
