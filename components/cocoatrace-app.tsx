'use client';

import { motion } from 'framer-motion';
import { Activity, ArrowUpRight, Bell, ChevronRight, CircleHelp, CloudSun, FileCheck2, Leaf, LogOut, MapPinned, Menu, Package, Search, ShieldAlert, Sprout, Users, Warehouse } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getDashboardSnapshot, type DashboardSnapshot } from '@/lib/supabase/dashboard';
import { supabase } from '@/lib/supabase/client';

type View = 'Overview' | 'Producers' | 'Farm registry' | 'Purchases' | 'Lots & custody' | 'Risk review' | 'Audit evidence';
const menu: { section: string; items: [View, typeof Leaf][] }[] = [
  { section: 'OPERATIONS', items: [['Overview', Sprout], ['Producers', Users], ['Farm registry', MapPinned], ['Purchases', Package], ['Lots & custody', Warehouse]] },
  { section: 'ASSURANCE', items: [['Risk review', ShieldAlert], ['Audit evidence', FileCheck2]] },
];
const demoMetrics: [string, string, string, typeof MapPinned][] = [
  ['Mapped farms', '2,046', 'field boundaries captured', MapPinned],
  ['Producer network', '1,284', 'verified cocoa growers', Users],
  ['Traceable bags', '5,000', 'purchase events secured', Package],
  ['Lots ready', '34 / 40', 'awaiting buyer evidence', FileCheck2],
];

function Badge({ children }: { children: string }) {
  const name = children.toLowerCase();
  const tone = name.includes('ready') || name.includes('verified') ? 'bg-[#e7f1e6] text-[#276342]' : name.includes('critical') || name.includes('high') ? 'bg-[#f9e5dc] text-[#a84a28]' : 'bg-[#f7ecd5] text-[#9b5a16]';
  return <span className={'rounded-full px-2.5 py-1 text-[10px] font-black ' + tone}>{children}</span>;
}

export function CocoaTraceApp() {
  const [view, setView] = useState<View>('Overview');
  const [drawer, setDrawer] = useState(false);
  const [account, setAccount] = useState<User>();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>();
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    setAccount(user ?? undefined);
    if (!user) { setSnapshot(undefined); return; }
    try { setError(''); setSnapshot(await getDashboardSnapshot(supabase)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load live workspace data.'); }
  }, []);
  useEffect(() => {
    void refresh();
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void refresh(); });
    return () => subscription.unsubscribe();
  }, [refresh]);
  const metrics = snapshot ? snapshot.metrics.map((item, index) => [item[0], item[1], item[2], [MapPinned, Users, Package, FileCheck2][index]] as [string, string, string, typeof MapPinned]) : demoMetrics;
  const ledger = snapshot?.ledger ?? [['AF-26-14482', 'Kwaso Society', '74 bags', 'Verified', 'Now'], ['AF-26-14481', 'Boinso Society', '61 bags', 'Review', '12 min'], ['LOT-WN-0926-14', 'Sefwi Depot', '184 bags', 'Export ready', '28 min']];
  const alerts = snapshot?.alerts ?? [['RA-148', 'Missing farm polygon', 'Sefwi Wiawso', 'High', '#c4652d'], ['RA-144', 'Risk score requires review', 'Wassa Amenfi West', 'Critical', '#b83b2a'], ['RA-139', 'Protected area proximity', 'Juaboso', 'Review', '#c9851c']];
  const signOut = async () => { if (supabase) { await supabase.auth.signOut(); await refresh(); } };
  const title = view === 'Overview' ? 'Field operations' : view;

  return <div className="min-h-screen bg-[#f6f3eb] text-[#2a1c13]">
    <aside className={'fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col bg-[#193c2c] px-4 py-5 text-[#f9f5ec] shadow-2xl transition-transform lg:translate-x-0 ' + (drawer ? 'translate-x-0' : '-translate-x-full')}>
      <Link href="/" className="flex items-center gap-3 px-2"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#efd06e] text-[#224631]"><Leaf size={19}/></span><span><span className="block text-base font-black tracking-[-.06em]">AuraFlow</span><span className="block text-[9px] font-bold uppercase tracking-[.2em] text-[#b8d6aa]">CocoaTrace</span></span></Link>
      <div className="mt-8 rounded-xl border border-white/10 bg-white/[.07] px-3 py-2.5"><div className="flex items-center gap-2 text-[#cbdac1]"><Search size={15}/><span className="text-xs">Search workspace</span><kbd className="ml-auto rounded bg-black/15 px-1.5 py-0.5 text-[9px]">⌘ K</kbd></div></div>
      <nav className="mt-7 space-y-6 overflow-y-auto">{menu.map((group) => <div key={group.section}><p className="mb-2 px-2 text-[9px] font-black tracking-[.16em] text-[#9db69d]">{group.section}</p><div className="space-y-1">{group.items.map(([item, Icon]) => <button key={item} onClick={() => { setView(item); setDrawer(false); }} className={'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition ' + (view === item ? 'bg-[#f3eddc] text-[#21422f]' : 'text-[#d8e3d3] hover:bg-white/[.08]')}><Icon size={16} className={view === item ? 'text-[#d67a1f]' : 'text-[#b8d6aa]'}/><span className="flex-1">{item}</span>{view === item && <ChevronRight size={14}/>}</button>)}</div></div>)}</nav>
      <div className="mt-auto rounded-2xl border border-white/10 bg-[#153122] p-3"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#e8a64f] text-[10px] font-black text-[#3d260e]">{account?.email?.slice(0, 2).toUpperCase() || 'AF'}</span><div className="min-w-0"><p className="truncate text-[11px] font-black">{snapshot?.operatorName || 'Preview workspace'}</p><p className="truncate text-[9px] text-[#a7bfaa]">{snapshot?.role || 'Connect to live data'}</p></div></div>{account ? <button onClick={signOut} className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-[#b8d6aa] hover:text-white"><LogOut size={13}/>Sign out</button> : <Link href="/auth" className="mt-3 inline-flex text-[10px] font-bold text-[#efd06e]">Sign in to workspace</Link>}</div>
    </aside>
    {drawer && <button aria-label="Close navigation" onClick={() => setDrawer(false)} className="fixed inset-0 z-30 bg-black/30 lg:hidden"/>}
    <main className="min-h-screen lg:pl-[268px]">
      <header className="sticky top-0 z-20 flex h-[72px] items-center gap-4 border-b border-[#e5dccd] bg-[#fbf9f4]/90 px-5 backdrop-blur lg:px-9"><button onClick={() => setDrawer(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#e4dac9] text-[#634a37] lg:hidden"><Menu size={18}/></button><div><p className="font-serif text-xl font-bold tracking-[-.04em]">{title}</p><p className="mt-0.5 text-[10px] font-bold text-[#8c7b6b]">{snapshot ? snapshot.organizationName : 'Ghana pilot workspace'}</p></div><div className="ml-auto hidden max-w-[360px] flex-1 items-center gap-2 rounded-xl border border-[#e5dccd] bg-white px-3 py-2 text-[#9a8979] md:flex"><Search size={15}/><input aria-label="Search traceability records" placeholder="Find a farm, bag or lot" className="w-full bg-transparent text-xs outline-none placeholder:text-[#a69686]"/></div><span className="hidden items-center gap-1.5 text-[11px] font-bold text-[#6f5b49] xl:flex"><CloudSun size={16} className="text-[#d77d1f]"/>26°C · humid</span><button className="grid h-9 w-9 place-items-center rounded-full text-[#735a42] hover:bg-[#f0eadf]"><Bell size={17}/></button><button className="grid h-9 w-9 place-items-center rounded-full text-[#735a42] hover:bg-[#f0eadf]"><CircleHelp size={17}/></button></header>
      <div className="mx-auto max-w-[1600px] p-5 lg:p-9">{error && <p role="alert" className="mb-5 rounded-xl border border-[#e8c5a5] bg-[#fff4e7] px-4 py-3 text-xs text-[#9b511e]">{error}</p>}{view === 'Overview' ? <Overview metrics={metrics} alerts={alerts} ledger={ledger} snapshot={snapshot} /> : <Module title={title} ledger={ledger} />}</div>
    </main>
  </div>;
}

function Overview({ metrics, alerts, ledger, snapshot }: { metrics: [string, string, string, typeof MapPinned][]; alerts: string[][]; ledger: string[][]; snapshot?: DashboardSnapshot }) {
  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-[24px] bg-[#e9dfcc] px-6 py-7 lg:px-8"><div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: 'url(/images/cocoa-estate-sunrise.png)' }}/><div className="absolute inset-0 bg-gradient-to-r from-[#f4ecdf] via-[#f4ecdf]/92 to-[#f4ecdf]/25"/><div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end"><div className="max-w-xl"><p className="inline-flex items-center gap-2 rounded-full bg-[#1f573c] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-[#f9f3e8]"><Activity size={13}/>{snapshot ? 'Live records connected' : 'Workspace preview'}</p><h1 className="mt-5 font-serif text-4xl font-bold tracking-[-.055em] text-[#2a1c13] sm:text-5xl">Good morning{snapshot ? ', ' + snapshot.operatorName.split(' ')[0] : ''}.</h1><p className="mt-3 text-sm leading-6 text-[#675746]">A clear view of what needs attention across your cocoa supply chain.</p></div><div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#d6c4a7] bg-[#fffaf1]/85 p-3 text-center backdrop-blur"><div className="px-4"><p className="text-[9px] font-black uppercase tracking-[.12em] text-[#947759]">Sync health</p><p className="mt-1 text-sm font-black text-[#23613d]">{snapshot ? 'Connected' : 'Preview'}</p></div><div className="border-l border-[#dfd0bc] px-4"><p className="text-[9px] font-black uppercase tracking-[.12em] text-[#947759]">Queued</p><p className="mt-1 text-sm font-black text-[#a75d18]">{snapshot?.queuedSyncs ?? 17} events</p></div></div></div></section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, sub, Icon]) => <motion.article whileHover={{ y: -3 }} key={label} className="rounded-2xl border border-[#e4dbcd] bg-[#fffdf8] p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.1em] text-[#8d7a69]">{label}</p><p className="mt-3 font-serif text-3xl font-bold tracking-[-.05em]">{value}</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf3e9] text-[#2c7046]"><Icon size={19}/></span></div><p className="mt-4 text-[11px] font-bold text-[#a56824]">{sub}</p></motion.article>)}</section>
    <section className="grid gap-6 xl:grid-cols-[1.35fr_.8fr]"><Ledger ledger={ledger}/><RiskList alerts={alerts}/></section>
    <section className="grid gap-6 xl:grid-cols-[.92fr_1.08fr]"><Trend snapshot={snapshot}/><FieldBrief/></section>
  </div>;
}

function Ledger({ ledger }: { ledger: string[][] }) { return <section className="overflow-hidden rounded-2xl border border-[#e4dbcd] bg-[#fffdf8]"><div className="flex items-end justify-between border-b border-[#eee5d9] px-5 py-5"><div><p className="font-serif text-xl font-bold tracking-[-.04em]">Today’s field ledger</p><p className="mt-1 text-[11px] text-[#867566]">Recent custody events across your network.</p></div><button className="inline-flex items-center gap-1 text-xs font-black text-[#2c7046]">Open ledger <ArrowUpRight size={14}/></button></div><div className="overflow-x-auto"><table className="w-full min-w-[580px] text-left"><thead className="bg-[#faf6ee] text-[9px] font-black uppercase tracking-[.12em] text-[#947f6a]"><tr><th className="px-5 py-3">Reference</th><th className="px-3 py-3">Origin</th><th className="px-3 py-3">Inventory</th><th className="px-3 py-3">Status</th><th className="px-5 py-3">Updated</th></tr></thead><tbody>{ledger.map((row) => <tr key={row[0]} className="border-t border-[#f0e8dc] text-xs"><td className="px-5 py-4 font-black text-[#2b7047]">{row[0]}</td><td className="px-3 py-4 text-[#6a5949]">{row[1]}</td><td className="px-3 py-4 text-[#6a5949]">{row[2]}</td><td className="px-3 py-4"><Badge>{row[3]}</Badge></td><td className="px-5 py-4 text-[#9a8978]">{row[4]}</td></tr>)}</tbody></table></div></section>; }
function RiskList({ alerts }: { alerts: string[][] }) { return <section className="rounded-2xl border border-[#e4dbcd] bg-[#fffdf8] p-5"><div className="flex items-end justify-between"><div><p className="font-serif text-xl font-bold tracking-[-.04em]">Needs review</p><p className="mt-1 text-[11px] text-[#867566]">Items holding back readiness.</p></div><ShieldAlert size={19} className="text-[#c06529]"/></div><div className="mt-4 space-y-2">{alerts.slice(0, 4).map((item) => <button key={item[0]} className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-left hover:border-[#eadfce] hover:bg-[#fdf9f2]"><span className="h-9 w-1 rounded-full" style={{ backgroundColor: item[4] }}/><div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{item[1]}</p><p className="mt-1 text-[10px] text-[#897869]">{item[0]} · {item[2]}</p></div><Badge>{item[3]}</Badge></button>)}</div><button className="mt-3 w-full rounded-xl border border-dashed border-[#d8cbb8] py-2.5 text-[11px] font-black text-[#6b553f]">Review assurance queue</button></section>; }
function Trend({ snapshot }: { snapshot?: DashboardSnapshot }) { return <section className="rounded-2xl bg-[#294a37] p-6 text-[#fffaf0]"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#d9dba2]">Traceability pulse</p><p className="mt-3 max-w-sm font-serif text-2xl font-bold leading-tight">Every verified movement strengthens the export story.</p><div className="mt-8 flex items-end gap-2">{[45,68,54,84,72,91,78,100,86,108,96,125].map((height, index) => <motion.span initial={{ height: 0 }} animate={{ height }} transition={{ delay: index * .035 }} key={index} className="w-full rounded-t-sm bg-[#e8b640]/90"/>)}</div><div className="mt-4 flex justify-between text-[10px] font-bold text-[#c7d5c4]"><span>14 days</span><span>{snapshot ? snapshot.metrics[2][1] + ' bags in tenant' : 'Synthetic pilot stream'}</span></div></section>; }
function FieldBrief() { return <section className="relative overflow-hidden rounded-2xl border border-[#e4dbcd] bg-[#fffdf8] p-6"><div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-[#f5d969]/25 blur-2xl"/><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#a86b22]">Field brief</p><h2 className="mt-3 max-w-md font-serif text-2xl font-bold tracking-[-.045em]">The next highest-value action is already clear.</h2><p className="mt-3 max-w-md text-sm leading-6 text-[#766354]">Complete the remaining farm polygons in Western North before the next lot sealing window.</p><div className="mt-6 flex flex-wrap gap-3"><span className="rounded-full bg-[#edf3e9] px-3 py-1.5 text-[10px] font-black text-[#276342]">42 polygons queued</span><span className="rounded-full bg-[#fbefda] px-3 py-1.5 text-[10px] font-black text-[#9e5c1b]">7 high-priority reviews</span></div><button className="mt-7 inline-flex items-center gap-2 text-xs font-black text-[#2b7047]">Open field plan <ArrowUpRight size={14}/></button></section>; }
function Module({ title, ledger }: { title: string; ledger: string[][] }) { const rows = useMemo(() => ledger, [ledger]); return <div className="space-y-6"><section className="rounded-[24px] bg-[#e9dfcc] p-7"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#a56824]">Workspace module</p><h1 className="mt-3 font-serif text-4xl font-bold tracking-[-.055em]">{title}</h1><p className="mt-3 max-w-lg text-sm leading-6 text-[#706051]">A purpose-built operational view for this part of the cocoa traceability flow.</p></section><Ledger ledger={rows}/></div>; }
