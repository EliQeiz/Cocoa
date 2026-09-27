'use client';

import { LogIn, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
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
    <Link href="/auth" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#2b74ff] px-3 py-2 text-xs font-black text-white sm:mt-0"><LogIn size={15}/>Sign in</Link>
    {!isSupabaseConfigured && <p className="mt-3 w-full text-[10px] text-amber-300">Supabase is not loaded in this running session. Restarting the app now.</p>}
  </section>;
}
