'use client';

import { CheckCircle2, ClipboardPlus, FileDown, Loader2, MapPinned, Plus, ShieldCheck, ShoppingBag, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type View = 'Producers' | 'Farm registry' | 'Purchases' | 'Lots & custody' | 'Risk review' | 'Audit evidence';
type Farmer = { id: string; farmer_code: string; full_name: string; community: string | null; compliance_status: string | null };
type Farm = { id: string; farmer_id: string; name: string | null; size_hectares: number | null };
type Society = { id: string; name: string | null; community: string | null; district_id: string };
type District = { id: string; name: string };
type Alert = { id: string; severity: string | null; status: string | null; recommendation: string | null };
type Audit = { id: string; report_code: string; buyer: string | null; status: string; generated_at: string };

const card = 'rounded-2xl border border-[#e4dbcd] bg-[#fffdf8]';
const field = 'h-10 w-full rounded-lg border border-[#e0d5c5] bg-[#fbf8f1] px-3 text-xs text-[#332217] outline-none focus:border-[#2b7047]';

export function OperationalPanel({ view, onCommitted }: { view: View; onCommitted: () => Promise<void> }) {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!supabase) return;
    const [farmerResult, farmResult, societyResult, districtResult, alertResult, auditResult] = await Promise.all([
      supabase.from('farmers').select('id, farmer_code, full_name, community, compliance_status').order('full_name').limit(60),
      supabase.from('farms').select('id, farmer_id, name, size_hectares').limit(100),
      supabase.from('societies').select('id, name, community, district_id').order('name'),
      supabase.from('districts').select('id, name').order('name'),
      supabase.from('risk_alerts').select('id, severity, status, recommendation').neq('status', 'resolved').order('severity').limit(20),
      supabase.from('audit_reports').select('id, report_code, buyer, status, generated_at').order('generated_at', { ascending: false }).limit(10),
    ]);
    setFarmers(farmerResult.data ?? []);
    setFarms(farmResult.data ?? []);
    setSocieties(societyResult.data ?? []);
    setDistricts(districtResult.data ?? []);
    setAlerts(alertResult.data ?? []);
    setAudits(auditResult.data ?? []);
  };
  useEffect(() => { void load(); }, []);
  const committed = async (message: string) => { setNotice(message); await load(); await onCommitted(); };

  if (view === 'Producers') return <Producers farmers={farmers} societies={societies} districts={districts} busy={busy} setBusy={setBusy} onDone={committed}/>;
  if (view === 'Purchases') return <Purchases farmers={farmers} farms={farms} busy={busy} setBusy={setBusy} onDone={committed}/>;
  if (view === 'Risk review') return <Risk alerts={alerts} busy={busy} setBusy={setBusy} onDone={committed}/>;
  if (view === 'Audit evidence') return <Audits audits={audits} busy={busy} setBusy={setBusy} onDone={committed}/>;
  return <section className={card + ' p-7'}><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#a56824]">Operational module</p><h2 className="mt-3 font-serif text-3xl font-bold">This workflow is ready for its next integration.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#746252]">Core records, security boundaries and audit events are in place. This surface can be expanded with GIS drawing and chain-of-custody scanning without changing the tenant model.</p>{notice && <Notice text={notice}/>}</section>;
}

function Producers({ farmers, societies, districts, busy, setBusy, onDone }: { farmers: Farmer[]; societies: Society[]; districts: District[]; busy: boolean; setBusy: (value: boolean) => void; onDone: (message: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', community: '', farm_name: '', size: '', society_id: '', district_id: '' });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('register_producer_with_farm', { p_society_id: form.society_id, p_district_id: form.district_id, p_full_name: form.full_name, p_phone: form.phone, p_community: form.community, p_farm_name: form.farm_name, p_size_hectares: Number(form.size) });
    setBusy(false);
    if (error) return void alert(error.message);
    setOpen(false);
    setForm({ full_name: '', phone: '', community: '', farm_name: '', size: '', society_id: '', district_id: '' });
    await onDone('Producer registered with reference ' + String(data?.farmer_code || 'created') + '.');
  };
  return <div className="space-y-5"><section className="flex flex-col justify-between gap-4 rounded-[24px] bg-[#e9dfcc] p-7 sm:flex-row sm:items-end"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#a56824]">First-mile registry</p><h1 className="mt-3 font-serif text-4xl font-bold tracking-[-.055em]">Producers</h1><p className="mt-3 max-w-lg text-sm leading-6 text-[#706051]">Build an accountable farmer and farm base before any cocoa enters the chain.</p></div><button onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-[#1f573c] px-4 py-3 text-xs font-black text-white"><Plus size={16}/>Register producer</button></section>
    {open && <form onSubmit={submit} className={card + ' grid gap-4 p-5 md:grid-cols-2'}><p className="md:col-span-2 text-xs font-black text-[#2b7047]">New producer & first farm</p><input className={field} required placeholder="Producer full name" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })}/><input className={field} placeholder="Mobile number" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })}/><select className={field} required value={form.society_id} onChange={(event) => setForm({ ...form, society_id: event.target.value })}><option value="">Select society</option>{societies.map((society) => <option key={society.id} value={society.id}>{society.name || society.community || 'Society'}</option>)}</select><select className={field} required value={form.district_id} onChange={(event) => setForm({ ...form, district_id: event.target.value })}><option value="">Select district</option>{districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}</select><input className={field} placeholder="Community" value={form.community} onChange={(event) => setForm({ ...form, community: event.target.value })}/><input className={field} placeholder="Farm name" value={form.farm_name} onChange={(event) => setForm({ ...form, farm_name: event.target.value })}/><input className={field} required min="0.1" step="0.1" type="number" placeholder="Farm size (hectares)" value={form.size} onChange={(event) => setForm({ ...form, size: event.target.value })}/><button disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#d77d1f] px-4 text-xs font-black text-white disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={15}/> : <ClipboardPlus size={15}/>}Create verified record</button></form>}
    <section className={card + ' overflow-hidden'}><div className="border-b border-[#eee5d9] px-5 py-4"><p className="font-serif text-xl font-bold">Producer directory</p><p className="mt-1 text-[11px] text-[#867566]">Live records visible to your organization.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-[#faf6ee] text-[9px] font-black uppercase tracking-[.12em] text-[#947f6a]"><tr><th className="px-5 py-3">Code</th><th className="px-3 py-3">Producer</th><th className="px-3 py-3">Community</th><th className="px-5 py-3">Readiness</th></tr></thead><tbody>{farmers.map((farmer) => <tr key={farmer.id} className="border-t border-[#f0e8dc] text-xs"><td className="px-5 py-3 font-black text-[#2b7047]">{farmer.farmer_code}</td><td className="px-3 py-3 font-bold">{farmer.full_name}</td><td className="px-3 py-3 text-[#6a5949]">{farmer.community || '—'}</td><td className="px-5 py-3"><Status text={farmer.compliance_status || 'pending review'}/></td></tr>)}</tbody></table></div></section></div>;
}

function Purchases({ farmers, farms, busy, setBusy, onDone }: { farmers: Farmer[]; farms: Farm[]; busy: boolean; setBusy: (value: boolean) => void; onDone: (message: string) => Promise<void> }) {
  const [form, setForm] = useState({ farmer_id: '', farm_id: '', weight: '', moisture: '7.0', price: '', payment: 'mobile_money' });
  const availableFarms = useMemo(() => farms.filter((farm) => farm.farmer_id === form.farmer_id), [farms, form.farmer_id]);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!supabase) return; setBusy(true); const { data, error } = await supabase.rpc('capture_farmgate_purchase', { p_farmer_id: form.farmer_id, p_farm_id: form.farm_id, p_weight_kg: Number(form.weight), p_moisture: Number(form.moisture), p_price: Number(form.price || 0), p_payment_method: form.payment }); setBusy(false); if (error) return void alert(error.message); setForm({ farmer_id: '', farm_id: '', weight: '', moisture: '7.0', price: '', payment: 'mobile_money' }); await onDone('Purchase captured. Bag reference: ' + String(data?.bag_code || 'created') + '.'); };
  return <div className="space-y-5"><section className="rounded-[24px] bg-[#e9dfcc] p-7"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#a56824]">Chain of custody</p><h1 className="mt-3 font-serif text-4xl font-bold tracking-[-.055em]">Farm-gate purchase</h1><p className="mt-3 max-w-lg text-sm leading-6 text-[#706051]">Capture the purchase and issue a unique, traceable bag reference in one transaction.</p></section><form onSubmit={submit} className={card + ' grid gap-4 p-5 md:grid-cols-2'}><select className={field} required value={form.farmer_id} onChange={(event) => setForm({ ...form, farmer_id: event.target.value, farm_id: '' })}><option value="">Select producer</option>{farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.full_name} · {farmer.farmer_code}</option>)}</select><select className={field} required disabled={!form.farmer_id} value={form.farm_id} onChange={(event) => setForm({ ...form, farm_id: event.target.value })}><option value="">Select farm</option>{availableFarms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name || 'Cocoa farm'} · {farm.size_hectares || '—'} ha</option>)}</select><input className={field} required min="1" step="0.1" type="number" placeholder="Weight (kg)" value={form.weight} onChange={(event) => setForm({ ...form, weight: event.target.value })}/><input className={field} required min="0" step="0.1" type="number" placeholder="Moisture %" value={form.moisture} onChange={(event) => setForm({ ...form, moisture: event.target.value })}/><input className={field} min="0" step="0.01" type="number" placeholder="Amount paid (GHS)" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })}/><select className={field} value={form.payment} onChange={(event) => setForm({ ...form, payment: event.target.value })}><option value="mobile_money">Mobile money</option><option value="cash">Cash</option><option value="deferred">Deferred</option></select><button disabled={busy} className="md:col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1f573c] text-xs font-black text-white disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={15}/> : <ShoppingBag size={15}/>}Capture purchase & issue bag ID</button></form></div>;
}

function Risk({ alerts, busy, setBusy, onDone }: { alerts: Alert[]; busy: boolean; setBusy: (value: boolean) => void; onDone: (message: string) => Promise<void> }) {
  const resolve = async (id: string) => { if (!supabase) return; setBusy(true); const { error } = await supabase.rpc('resolve_risk_alert', { p_alert_id: id, p_resolution_note: 'Reviewed and resolved in AuraFlow workspace.' }); setBusy(false); if (error) return void alert(error.message); await onDone('Risk exception resolved and audit event recorded.'); };
  return <div className="space-y-5"><section className="rounded-[24px] bg-[#e9dfcc] p-7"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#a56824]">Assurance workbench</p><h1 className="mt-3 font-serif text-4xl font-bold tracking-[-.055em]">Risk review</h1><p className="mt-3 max-w-lg text-sm leading-6 text-[#706051]">Resolve exceptions with a durable audit trail before they impact a lot or buyer submission.</p></section><div className="space-y-3">{alerts.map((alert) => <section key={alert.id} className={card + ' flex flex-col gap-4 p-5 sm:flex-row sm:items-center'}><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f9e5dc] text-[#ae4c27]"><ShieldCheck size={19}/></span><div className="flex-1"><p className="text-xs font-black">{alert.recommendation || 'Compliance review required'}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#997a60]">{alert.severity || 'review'} · open exception</p></div><button disabled={busy} onClick={() => void resolve(alert.id)} className="rounded-lg border border-[#cce0cd] bg-[#edf5ec] px-3 py-2 text-[11px] font-black text-[#246142] disabled:opacity-50">Mark resolved</button></section>)}</div></div>;
}

function Audits({ audits, busy, setBusy, onDone }: { audits: Audit[]; busy: boolean; setBusy: (value: boolean) => void; onDone: (message: string) => Promise<void> }) {
  const [buyer, setBuyer] = useState('');
  const [latest, setLatest] = useState('');
  const create = async (event: React.FormEvent) => { event.preventDefault(); if (!supabase) return; setBusy(true); const { data, error } = await supabase.rpc('generate_audit_packet', { p_buyer: buyer }); setBusy(false); if (error) return void alert(error.message); const code = String(data?.report_code || 'created'); setLatest(code); setBuyer(''); await onDone('Buyer evidence packet ' + code + ' is ready.'); };
  return <div className="space-y-5"><section className="rounded-[24px] bg-[#e9dfcc] p-7"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#a56824]">Buyer-ready evidence</p><h1 className="mt-3 font-serif text-4xl font-bold tracking-[-.055em]">Audit packets</h1><p className="mt-3 max-w-lg text-sm leading-6 text-[#706051]">Create an immutable summary of farmer, farm, polygon, bag and risk evidence for a buyer conversation.</p></section><form onSubmit={create} className={card + ' flex flex-col gap-3 p-5 sm:flex-row'}><input className={field} required placeholder="Buyer or counterparty name" value={buyer} onChange={(event) => setBuyer(event.target.value)}/><button disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#d77d1f] px-4 text-xs font-black text-white disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={15}/> : <FileDown size={15}/>}Generate packet</button></form>{latest && <Notice text={'Packet ' + latest + ' generated with a SHA-256 evidence checksum.'}/>}<section className={card + ' overflow-hidden'}><div className="border-b border-[#eee5d9] px-5 py-4"><p className="font-serif text-xl font-bold">Evidence register</p></div>{audits.map((audit) => <div key={audit.id} className="flex items-center gap-3 border-b border-[#f0e8dc] px-5 py-4 last:border-0"><CheckCircle2 size={17} className="text-[#2c7046]"/><div className="flex-1"><p className="text-xs font-black">{audit.report_code}</p><p className="mt-1 text-[10px] text-[#857463]">{audit.buyer || 'Unassigned buyer'}</p></div><Status text={audit.status}/></div>)}</section></div>;
}

function Status({ text }: { text: string }) { const green = text.toLowerCase().includes('verified') || text.toLowerCase().includes('ready') || text.toLowerCase().includes('resolved'); return <span className={green ? 'rounded-full bg-[#e7f1e6] px-2.5 py-1 text-[10px] font-black text-[#276342]' : 'rounded-full bg-[#f9ecd8] px-2.5 py-1 text-[10px] font-black text-[#9b5a16]'}>{text}</span>; }
function Notice({ text }: { text: string }) { return <p role="status" className="rounded-xl border border-[#cde0ce] bg-[#edf5ec] px-4 py-3 text-xs font-bold text-[#276342]">{text}</p>; }
