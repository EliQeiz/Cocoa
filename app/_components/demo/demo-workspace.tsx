"use client";

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  Copy,
  FileCheck2,
  FileText,
  FolderKanban,
  GitPullRequestArrow,
  HardHat,
  Home,
  MapPinned,
  Menu,
  MoreHorizontal,
  NotebookPen,
  PackageCheck,
  ReceiptText,
  Search,
  Send,
  Settings,
  ShieldCheck,
  TextQuote,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BuildProofBrand } from "../buildproof-brand";

type NavigationItem = {
  label: string;
  icon: LucideIcon;
  count?: number;
};

const navigationGroups: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: "Overview",
    items: [
      { label: "Home", icon: Home },
      { label: "Projects", icon: FolderKanban },
    ],
  },
  {
    label: "Project control",
    items: [
      { label: "Evidence", icon: FileCheck2, count: 62 },
      { label: "Materials", icon: PackageCheck, count: 3 },
      { label: "Deliveries", icon: ReceiptText },
      { label: "RFIs", icon: TextQuote, count: 4 },
      { label: "Submittals", icon: Send },
      { label: "Daily logs", icon: NotebookPen },
      { label: "Approvals", icon: ClipboardCheck, count: 12 },
      { label: "Issues", icon: CircleAlert, count: 3 },
      { label: "Change orders", icon: GitPullRequestArrow },
    ],
  },
  {
    label: "Organisation",
    items: [
      { label: "Reports", icon: FileText },
      { label: "Team", icon: UsersRound },
      { label: "Settings", icon: Settings },
    ],
  },
];

const moduleContent: Record<
  string,
  { description: string; metric: string; rows: Array<[string, string, string, string]> }
> = {
  Projects: {
    description: "Programme visibility across active projects and delivery teams.",
    metric: "1 active project",
    rows: [
      ["Northbank Civic Centre", "PRJ-1047", "Accra, Greater Accra", "Active"],
      ["Tema Logistics Yard", "PRJ-1038", "Tema", "Pre-construction"],
      ["Volta Water Intake", "PRJ-1022", "Akosombo", "Completed"],
    ],
  },
  Evidence: {
    description: "Traceable field records linked to locations, materials and reviewers.",
    metric: "438 verified records",
    rows: [
      ["Cement delivery", "Batch #3287", "J. Mensah", "Verified"],
      ["Reinforcement check", "CH 11+200", "S. Kim", "Verified"],
      ["Subgrade completion", "CH 10+800", "M. Torres", "In review"],
      ["Concrete compression test", "Laboratory", "A. Rahman", "Verified"],
      ["Aggregate delivery", "Batch #7712", "J. Lee", "Verified"],
    ],
  },
  Materials: {
    description: "Approved, received and verified quantities with batch-level traceability.",
    metric: "124 verified packages",
    rows: [
      ["Cement (C35)", "MAT-3287", "42 / 50 tonnes", "Verified"],
      ["Rebar (B500B)", "MAT-7712", "28 / 30 tonnes", "Verified"],
      ["Aggregates (Graded)", "MAT-6604", "16 / 20 loads", "In review"],
      ["Bitumen (60/70)", "MAT-4481", "8 / 10 drums", "Verified"],
      ["Precast elements", "MAT-9021", "2 / 5 units", "Flagged"],
    ],
  },
  Deliveries: {
    description: "Site receipts reconciled against purchase and material records.",
    metric: "36 deliveries this month",
    rows: [
      ["DEL-030", "Cement (C35)", "12 Apr 2025 · 08:42", "Accepted"],
      ["DEL-029", "Rebar (B500B)", "11 Apr 2025 · 14:10", "Accepted"],
      ["DEL-028", "Aggregates", "10 Apr 2025 · 10:25", "Inspection due"],
      ["DEL-027", "Bitumen (60/70)", "09 Apr 2025 · 16:08", "Accepted"],
    ],
  },
  RFIs: {
    description: "Questions, design clarifications and accountable responses in one queue.",
    metric: "4 responses due",
    rows: [
      ["RFI-041", "Expansion joint detail", "Structural engineer", "Open"],
      ["RFI-040", "Drainage invert level", "Civil engineer", "Answered"],
      ["RFI-039", "Facade fixing tolerance", "Architect", "Answered"],
      ["RFI-038", "Cable route conflict", "MEP consultant", "Open"],
    ],
  },
  Submittals: {
    description: "Technical submissions, revisions and consultant decisions.",
    metric: "9 awaiting review",
    rows: [
      ["SUB-118", "C35 mix design", "Revision 02", "Approved"],
      ["SUB-117", "Waterproofing system", "Revision 01", "In review"],
      ["SUB-116", "Facade sample panel", "Revision 03", "Approved"],
      ["SUB-115", "Fire door schedule", "Revision 01", "Returned"],
    ],
  },
  "Daily logs": {
    description: "A dependable record of labour, weather, work fronts and constraints.",
    metric: "18 consecutive days",
    rows: [
      ["12 Apr 2025", "246 workers", "Foundation and structure", "Complete"],
      ["11 Apr 2025", "231 workers", "Structure and services", "Complete"],
      ["10 Apr 2025", "219 workers", "Concrete pour", "Complete"],
      ["09 Apr 2025", "224 workers", "Rebar and formwork", "Complete"],
    ],
  },
  Approvals: {
    description: "Decision queues with clear owners, due dates and audit history.",
    metric: "12 pending decisions",
    rows: [
      ["APR-224", "C35 delivery release", "Project manager", "Pending"],
      ["APR-223", "Level 02 structural drawing", "Consultant", "Overdue"],
      ["APR-222", "Rebar batch #7712", "Quality manager", "Approved"],
      ["APR-221", "Subgrade evidence pack", "Resident engineer", "Pending"],
    ],
  },
  Issues: {
    description: "Site risks and exceptions tracked from observation to closure.",
    metric: "3 active risks",
    rows: [
      ["ISS-017", "Precast tolerance variance", "Quality", "Open"],
      ["ISS-016", "Rebar supply delay", "Programme", "Mitigating"],
      ["ISS-015", "Temporary access drainage", "Site", "Open"],
      ["ISS-014", "Concrete cube result", "Quality", "Closed"],
    ],
  },
  "Change orders": {
    description: "Commercial changes connected to evidence, approvals and programme impact.",
    metric: "GHS 184k under review",
    rows: [
      ["CO-009", "Drainage diversion", "GHS 96,400", "In review"],
      ["CO-008", "Facade access revision", "GHS 87,600", "In review"],
      ["CO-007", "Ground improvement", "GHS 142,000", "Approved"],
      ["CO-006", "Generator foundation", "GHS 31,800", "Approved"],
    ],
  },
  Reports: {
    description: "Project-control reporting assembled from the same evidence record.",
    metric: "8 scheduled reports",
    rows: [
      ["Weekly controls report", "Every Monday", "Project leadership", "Scheduled"],
      ["Material compliance", "Weekly", "Quality team", "Ready"],
      ["Funding assurance", "Monthly", "Client PMO", "Ready"],
      ["Risk and issue register", "Weekly", "Delivery team", "Scheduled"],
    ],
  },
  Team: {
    description: "Project membership, responsibilities and access in one controlled roster.",
    metric: "23 active members",
    rows: [
      ["Jordan Lee", "Project manager", "Delivery", "Active"],
      ["Sarah Kim", "Site engineer", "Site operations", "Active"],
      ["Joseph Mensah", "Quality lead", "Assurance", "Active"],
      ["Amina Rahman", "Materials engineer", "Quality", "Active"],
    ],
  },
  Settings: {
    description: "Organisation, project, role and retention controls.",
    metric: "Enterprise controls enabled",
    rows: [
      ["Project roles", "8 configured roles", "Organisation owner", "Configured"],
      ["Evidence retention", "7 years", "Compliance", "Configured"],
      ["Approval policy", "Two-stage review", "Project controls", "Configured"],
      ["Audit exports", "Owner and auditor", "Security", "Configured"],
    ],
  },
};

const materials = [
  ["Cement (C35)", "Batch #3287", "Verified", "42 / 50", "w-[84%]", "bg-emerald-600"],
  ["Rebar (B500B)", "Batch #7712", "Verified", "28 / 30", "w-[93%]", "bg-emerald-600"],
  ["Aggregates (Graded)", "Batch #6604", "In review", "16 / 20", "w-4/5", "bg-amber-500"],
  ["Bitumen (60/70)", "Batch #4481", "Verified", "8 / 10", "w-4/5", "bg-emerald-600"],
  ["Precast elements", "Batch #9021", "Flagged", "2 / 5", "w-2/5", "bg-rose-600"],
] as const;

const evidence = [
  ["12 Apr 2025", "Material delivery", "Cement delivery · Batch #3287", "J. Mensah", "Verified"],
  ["10 Apr 2025", "Inspection", "Reinforcement check", "S. Kim", "Verified"],
  ["08 Apr 2025", "Site photo", "Subgrade completion", "M. Torres", "In review"],
  ["05 Apr 2025", "Test result", "Concrete compression test", "A. Rahman", "Verified"],
] as const;

function statusTone(value: string) {
  if (["Verified", "Approved", "Accepted", "Active", "Ready", "Complete", "Completed", "Configured", "Scheduled", "Answered", "Closed"].includes(value))
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (["Flagged", "Overdue", "Returned", "Open"].includes(value))
    return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

export function DemoWorkspace() {
  const [active, setActive] = useState("Home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [projectMenu, setProjectMenu] = useState(false);
  const [notice, setNotice] = useState("");

  const allItems = useMemo(() => navigationGroups.flatMap((group) => group.items), []);
  const filteredItems = allItems.filter((item) =>
    item.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSidebarOpen(false);
        setProjectMenu(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function navigate(label: string) {
    setActive(label);
    setSidebarOpen(false);
    setSearchOpen(false);
    setQuery("");
  }

  function demoAction(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4200);
  }

  async function copyDemoLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      demoAction("Demo link copied to your clipboard.");
    } catch {
      demoAction("Copy the address from your browser to share this demo.");
    }
  }

  return (
    <main className="min-h-dvh bg-[#F6F9FB] text-slate-950">
      <a href="#demo-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:shadow-lg">
        Skip to demo content
      </a>
      <div className={`grid min-h-dvh ${sidebarCollapsed ? "lg:grid-cols-[76px_minmax(0,1fr)]" : "lg:grid-cols-[258px_minmax(0,1fr)]"}`}>
        <aside className={`fixed inset-y-0 left-0 z-50 flex w-[258px] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 lg:shadow-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} ${sidebarCollapsed ? "lg:w-[76px]" : ""}`} aria-label="Demo workspace navigation">
          <div className="flex h-[76px] items-center justify-between border-b border-slate-200 px-4">
            <Link href="/" aria-label="BuildProof home" className={sidebarCollapsed ? "lg:[&_.buildproof-wordmark]:hidden" : ""}>
              <BuildProofBrand compact />
            </Link>
            <button type="button" onClick={() => setSidebarOpen(false)} className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Close menu"><X size={20} /></button>
          </div>
          <button type="button" onClick={() => setSearchOpen(true)} className={`mx-3 mt-4 flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 hover:border-sky-300 hover:bg-sky-50 ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}>
            <Search size={17} /><span className={sidebarCollapsed ? "lg:hidden" : ""}>Search workspace</span><kbd className={`ml-auto rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] ${sidebarCollapsed ? "lg:hidden" : ""}`}>⌘K</kbd>
          </button>
          <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-5">
            {navigationGroups.map((group) => (
              <div key={group.label} className="mb-5">
                <p className={`mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600 ${sidebarCollapsed ? "lg:hidden" : ""}`}>{group.label}</p>
                <div className="grid gap-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const selected = active === item.label;
                    return (
                      <button key={item.label} type="button" onClick={() => navigate(item.label)} title={sidebarCollapsed ? item.label : undefined} aria-current={selected ? "page" : undefined} className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition ${selected ? "bg-orange-50 text-orange-800 ring-1 ring-inset ring-orange-100" : "text-slate-600 hover:bg-sky-50 hover:text-slate-950"} ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}>
                        <Icon size={18} className={selected ? "text-orange-600" : "text-slate-400 group-hover:text-sky-600"} />
                        <span className={sidebarCollapsed ? "lg:hidden" : ""}>{item.label}</span>
                        {item.count ? <span className={`ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] tabular-nums text-slate-500 ring-1 ring-slate-200 ${sidebarCollapsed ? "lg:hidden" : ""}`}>{item.count}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className={`border-t border-slate-200 p-3 ${sidebarCollapsed ? "lg:p-2" : ""}`}>
            <div className={`rounded-xl border border-sky-200 bg-sky-50 p-3 ${sidebarCollapsed ? "lg:grid lg:place-items-center lg:p-2" : ""}`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-sky-700 ring-1 ring-sky-200"><Building2 size={18} /></span>
              <div className={`mt-2 ${sidebarCollapsed ? "lg:hidden" : ""}`}><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-700">Demo workspace</p><strong className="mt-0.5 block text-sm">Ridgeview Construction</strong></div>
            </div>
          </div>
        </aside>

        {sidebarOpen ? <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] lg:hidden" onClick={() => setSidebarOpen(false)} /> : null}

        <section className="min-w-0">
          <div className="border-b border-orange-200 bg-orange-50 px-4 py-2 text-center text-xs font-semibold text-orange-900 sm:text-sm">
            You’re exploring a read-only demo with fictional project data. <Link href="/auth?mode=signup" className="ml-1 underline decoration-orange-300 underline-offset-4">Create a secure workspace</Link>
          </div>
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-lg sm:px-6 xl:px-8">
            <div className="flex min-h-[74px] items-center gap-3">
              <button type="button" onClick={() => setSidebarOpen(true)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 lg:hidden" aria-label="Open navigation"><Menu size={20} /></button>
              <button type="button" onClick={() => setSidebarCollapsed((value) => !value)} className="hidden h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 lg:grid" aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}><Menu size={19} /></button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-orange-700">Project command centre</p>
                <div className="flex items-center gap-2"><h1 className="truncate font-heading text-lg font-bold tracking-[-0.025em] sm:text-[22px]">Northbank Civic Centre</h1><span className="hidden rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200 sm:inline">Active</span></div>
                <p className="hidden text-xs text-slate-500 sm:block">Accra, Greater Accra · PRJ-1047 · Public infrastructure</p>
              </div>
              <button type="button" onClick={() => setSearchOpen(true)} className="hidden h-11 min-w-[260px] max-w-[420px] flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-left text-sm text-slate-500 hover:border-sky-300 xl:flex"><Search size={17} />Search records, materials, teams…<kbd className="ml-auto rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[10px]">⌘K</kbd></button>
              <div className="hidden items-center gap-2 text-xs text-slate-600 2xl:flex"><CalendarDays size={16} />Jan 2024 – Dec 2026</div>
              <div className="hidden items-center gap-2 sm:flex"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-[62%] bg-orange-500" /></div><strong className="text-xs">62%</strong></div>
              <button type="button" onClick={() => demoAction("There are no live notifications in the public demo.")} className="relative grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-sky-50" aria-label="Notifications"><Bell size={18} /><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white" /></button>
              <button type="button" onClick={copyDemoLink} className="hidden h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-sky-300 hover:bg-sky-50 md:flex"><Copy size={15} />Share demo</button>
              <Link href="/" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Exit demo"><ArrowLeft size={18} /></Link>
            </div>
          </header>

          <div id="demo-content" className="mx-auto max-w-[1680px] p-4 sm:p-6 xl:p-8">
            {notice ? <div role="status" className="mb-4 flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification"><X size={17} /></button></div> : null}
            {active === "Home" ? (
              <Dashboard onNavigate={navigate} onDemoAction={demoAction} projectMenu={projectMenu} setProjectMenu={setProjectMenu} />
            ) : (
              <ModuleWorkspace name={active} onBack={() => navigate("Home")} onDemoAction={demoAction} />
            )}
          </div>
        </section>
      </div>

      {searchOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-start bg-slate-950/45 px-4 pt-[12vh] backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSearchOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-label="Search demo workspace" className="w-full max-w-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-200 px-5"><Search size={19} className="text-slate-400" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search workspace modules…" className="h-16 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400" /><button type="button" onClick={() => setSearchOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close search"><X size={18} /></button></div>
            <div className="max-h-[360px] overflow-y-auto p-2">
              {filteredItems.map((item) => { const Icon = item.icon; return <button key={item.label} type="button" onClick={() => navigate(item.label)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-900"><span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-50 text-sky-700"><Icon size={17} /></span>{item.label}<ArrowRight size={15} className="ml-auto text-slate-400" /></button>; })}
              {!filteredItems.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">No matching workspace area.</p> : null}
            </div>
            <footer className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">Fictional records · read-only product tour</footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function Dashboard({ onNavigate, onDemoAction, projectMenu, setProjectMenu }: { onNavigate: (label: string) => void; onDemoAction: (message: string) => void; projectMenu: boolean; setProjectMenu: (value: boolean) => void }) {
  return (
    <>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-700">Project overview</p><h2 className="mt-1 font-heading text-2xl font-bold tracking-[-0.03em] text-slate-950">Performance at a glance</h2><p className="mt-1 text-sm text-slate-500">A demonstration of connected project controls using fictional records.</p></div>
        <div className="relative"><button type="button" onClick={() => setProjectMenu(!projectMenu)} className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:border-orange-300">Project actions <ChevronDown size={16} /></button>{projectMenu ? <div className="absolute right-0 top-12 z-20 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"><button type="button" onClick={() => onDemoAction("Release-pack generation is available in a secure workspace.")} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">Generate release pack</button><button type="button" onClick={() => onDemoAction("Project settings are read-only in this public demo.")} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">Project settings</button></div> : null}</div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Project progress" icon={Activity} tone="emerald"><div className="flex items-center gap-5"><div className="grid h-20 w-20 place-items-center rounded-full bg-[conic-gradient(#059669_62%,#E2E8F0_0)]"><div className="grid h-14 w-14 place-items-center rounded-full bg-white font-heading text-xl font-bold">62%</div></div><div className="space-y-2 text-xs text-slate-600"><p><i className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-600" />On track <b className="float-right ml-6 text-slate-900">8</b></p><p><i className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-500" />At risk <b className="float-right ml-6 text-slate-900">3</b></p><p><i className="mr-2 inline-block h-2 w-2 rounded-full bg-rose-600" />Delayed <b className="float-right ml-6 text-slate-900">1</b></p></div></div></MetricCard>
        <MetricCard title="Evidence" icon={FileCheck2} tone="sky" onClick={() => onNavigate("Evidence")}><MetricValues values={[["438", "Verified", "text-emerald-700"], ["62", "In review", "text-amber-700"], ["4", "Flagged", "text-rose-700"]]} /></MetricCard>
        <MetricCard title="Materials" icon={PackageCheck} tone="orange" onClick={() => onNavigate("Materials")}><MetricValues values={[["124", "Verified", "text-emerald-700"], ["18", "Pending", "text-amber-700"], ["3", "Non-compliant", "text-rose-700"]]} /></MetricCard>
        <MetricCard title="Approvals" icon={ClipboardCheck} tone="rose" onClick={() => onNavigate("Approvals")}><MetricValues values={[["12", "Pending", "text-slate-600"], ["7", "Overdue", "text-rose-700"], ["5", "Approved", "text-emerald-700"]]} /></MetricCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.18fr_1fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,.045)]">
          <div className="flex items-center justify-between px-5 py-4"><div><h3 className="font-heading text-base font-bold">Site location</h3><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><MapPinned size={14} />Accra, Greater Accra</p></div><span className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">Satellite</span></div>
          <div className="relative aspect-[16/7.6] min-h-[280px] overflow-hidden bg-slate-200 xl:min-h-[500px]">
            <div role="img" aria-label="Illustrative aerial view of the Northbank Civic Centre construction site" className="absolute inset-0 bg-[url('/images/buildproof-site-map.png')] bg-cover bg-center" />
            <div className="absolute left-4 top-4 flex overflow-hidden rounded-lg bg-white shadow-lg"><button className="bg-slate-950 px-3 py-2 text-xs font-semibold text-white">Map</button><button className="px-3 py-2 text-xs font-semibold text-slate-700">Satellite</button><button className="px-3 py-2 text-xs font-semibold text-slate-700">Terrain</button></div>
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center"><span className="grid h-11 w-9 place-items-center rounded-t-full rounded-bl-full bg-orange-600 text-white shadow-xl ring-4 ring-white/80 [transform:rotate(45deg)]"><HardHat size={17} className="-rotate-45" /></span><strong className="ml-2 whitespace-nowrap rounded-lg bg-slate-950/90 px-3 py-2 text-xs text-white shadow-lg">Northbank Civic Centre</strong></div>
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-x-6 gap-y-2 bg-slate-950/90 px-4 py-3 text-xs font-medium text-white backdrop-blur"><span className="flex items-center gap-2"><MapPinned size={14} />Accra, Greater Accra</span><span>5.6037° N, 0.1870° W</span><button type="button" onClick={() => onDemoAction("Site-detail mapping is illustrated with fictional project data.")} className="ml-auto rounded-lg border border-white/30 px-3 py-2 hover:bg-white/10">View site details →</button></div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,.045)]">
          <div className="flex items-center justify-between"><h3 className="font-heading text-base font-bold">Project health</h3><span className="flex items-center gap-2 text-xs text-slate-500"><i className="h-2 w-2 rounded-full bg-emerald-500" />Demo data</span></div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Health icon={CheckCircle2} value="On track" label="Schedule" /><Health icon={CircleAlert} value="3" label="Active risks" warn /><Health icon={FileText} value="78%" label="Evidence compliant" /><Health icon={UsersRound} value="Good" label="Site activity" /></div>
          <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-5"><h3 className="font-heading text-base font-bold">Material trace</h3><button type="button" onClick={() => onNavigate("Materials")} className="text-xs font-bold text-orange-700">View all →</button></div>
          <div className="mt-2 divide-y divide-slate-100">
            {materials.map((row, index) => <div key={row[0]} className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 sm:grid-cols-[38px_minmax(130px,1fr)_auto_52px_minmax(70px,.8fr)_18px]"><span className={`h-8 w-9 rounded-md bg-cover bg-center material-thumb-${index + 1}`} /><div className="min-w-0"><strong className="block truncate text-xs font-semibold">{row[0]}</strong><span className="text-[10px] text-slate-500">{row[1]}</span></div><span className={`hidden rounded-md px-2 py-1 text-[10px] font-semibold sm:inline ${statusTone(row[2])}`}>{row[2]}</span><span className="hidden text-xs tabular-nums text-slate-600 sm:block">{row[3]}</span><div className="hidden h-1.5 overflow-hidden rounded-full bg-slate-200 sm:block"><div className={`h-full ${row[4]} ${row[5]}`} /></div><MoreHorizontal size={16} className="hidden text-slate-400 sm:block" /></div>)}
          </div>
        </article>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_.95fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,.045)]"><div className="flex items-center justify-between px-5 py-4"><h3 className="font-heading text-base font-bold">Evidence ledger</h3><button type="button" onClick={() => onNavigate("Evidence")} className="text-xs font-bold text-orange-700">View all →</button></div><div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Evidence ledger"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{["Date", "Type", "Description", "Author", "Status"].map((heading) => <th key={heading} className="px-5 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{evidence.map((row) => <tr key={row[2]} className="hover:bg-sky-50/60">{row.map((cell, index) => <td key={cell} className={`px-5 py-3 ${index === 2 ? "font-semibold text-slate-900" : "text-slate-600"}`}>{index === 4 ? <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${statusTone(cell)}`}>{cell}</span> : cell}</td>)}</tr>)}</tbody></table></div></article>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2"><article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-emerald-700 ring-1 ring-emerald-200"><FileText size={19} /></span><div><h3 className="font-heading text-sm font-bold">Ready for review</h3><p className="mt-1 text-xs leading-5 text-emerald-950/80">Evidence coverage meets the demo release threshold.</p></div></div><ul className="mt-5 space-y-2 text-xs text-emerald-900">{["Material traceability", "Quality test results", "Site evidence"].map((item) => <li key={item} className="flex items-center gap-2"><Check size={14} />{item}</li>)}</ul><button type="button" onClick={() => onDemoAction("Release packs are generated only inside authenticated workspaces.")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-3 py-2.5 text-xs font-bold text-white">Preview release workflow <ArrowRight size={14} /></button></article><article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><h3 className="font-heading text-sm font-bold">Recent activity</h3><button type="button" onClick={() => onNavigate("Evidence")} className="text-[10px] font-bold text-orange-700">View all</button></div><div className="mt-3 divide-y divide-slate-100">{[["Evidence uploaded", "2 hours ago"], ["Risk updated", "4 hours ago"], ["Approval requested", "1 day ago"], ["Inspection completed", "2 days ago"]].map((row, index) => <div key={row[0]} className="flex items-center gap-3 py-2.5"><span className={`h-2 w-2 rounded-full ${index === 1 ? "bg-amber-500" : "bg-emerald-500"}`} /><div className="min-w-0"><strong className="block truncate text-xs">{row[0]}</strong><span className="text-[10px] text-slate-500">{row[1]}</span></div></div>)}</div></article></div>
      </div>
    </>
  );
}

function MetricCard({ title, icon: Icon, tone, children, onClick }: { title: string; icon: LucideIcon; tone: "emerald" | "sky" | "orange" | "rose"; children: React.ReactNode; onClick?: () => void }) {
  const tones = { emerald: "border-t-emerald-500 text-emerald-700 bg-emerald-50", sky: "border-t-sky-500 text-sky-700 bg-sky-50", orange: "border-t-orange-500 text-orange-700 bg-orange-50", rose: "border-t-rose-500 text-rose-700 bg-rose-50" };
  return <article className="rounded-2xl border border-t-2 border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,.045)]"><div className="mb-5 flex items-center justify-between"><h3 className="font-heading text-sm font-bold">{title}</h3>{onClick ? <button type="button" onClick={onClick} className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`} aria-label={`Open ${title}`}><Icon size={18} /></button> : <span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`} aria-hidden="true"><Icon size={18} /></span>}</div>{children}</article>;
}

function MetricValues({ values }: { values: Array<[string, string, string]> }) {
  return <div className="grid grid-cols-3 divide-x divide-slate-200">{values.map(([value, label, tone]) => <div key={label} className="px-3 first:pl-0"><strong className="font-heading text-2xl font-bold tabular-nums">{value}</strong><span className={`mt-1 block text-[10px] font-semibold ${tone}`}>{label}</span></div>)}</div>;
}

function Health({ icon: Icon, value, label, warn = false }: { icon: LucideIcon; value: string; label: string; warn?: boolean }) {
  return <div className="rounded-xl border border-slate-200 p-3"><span className={`mb-2 grid h-8 w-8 place-items-center rounded-full ${warn ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}><Icon size={17} /></span><strong className="block text-xs">{value}</strong><span className="mt-0.5 block text-[10px] text-slate-500">{label}</span></div>;
}

function ModuleWorkspace({ name, onBack, onDemoAction }: { name: string; onBack: () => void; onDemoAction: (message: string) => void }) {
  const content = moduleContent[name] ?? { description: "Explore this connected project-control workspace.", metric: "Demo records", rows: [] };
  const item = navigationGroups.flatMap((group) => group.items).find((candidate) => candidate.label === name);
  const Icon = item?.icon ?? FolderKanban;
  return <section><button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-orange-700"><ArrowLeft size={16} />Back to overview</button><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,.045)] sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-4"><span className="grid h-12 w-12 place-items-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-200"><Icon size={22} /></span><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-700">Northbank Civic Centre</p><h2 className="mt-1 font-heading text-2xl font-bold tracking-[-0.03em]">{name}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{content.description}</p></div></div><button type="button" onClick={() => onDemoAction(`Creating ${name.toLowerCase()} records requires a secure BuildProof workspace.`)} className="h-11 rounded-xl bg-orange-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-orange-800">New record</button></div><div className="mt-8 grid gap-4 border-y border-slate-200 py-5 sm:grid-cols-3"><div><span className="text-xs text-slate-500">Current position</span><strong className="mt-1 block font-heading text-xl">{content.metric}</strong></div><div><span className="text-xs text-slate-500">Project</span><strong className="mt-1 block text-sm">PRJ-1047 · Northbank Civic Centre</strong></div><div><span className="text-xs text-slate-500">Data mode</span><strong className="mt-1 flex items-center gap-2 text-sm text-sky-800"><ShieldCheck size={16} />Fictional and read-only</strong></div></div><div className="mt-6 overflow-x-auto rounded-xl border border-slate-200" tabIndex={0} role="region" aria-label={`${name} records`}><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Record", "Reference", "Owner / quantity", "Status"].map((heading) => <th key={heading} className="px-5 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{content.rows.map((row) => <tr key={`${row[0]}-${row[1]}`} className="hover:bg-sky-50/60">{row.map((cell, index) => <td key={`${cell}-${index}`} className={`px-5 py-4 ${index === 0 ? "font-semibold text-slate-950" : "text-slate-600"}`}>{index === 3 ? <span className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${statusTone(cell)}`}>{cell}</span> : cell}</td>)}</tr>)}</tbody></table></div><div className="mt-5 flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950 sm:flex-row sm:items-center"><CircleAlert size={18} className="shrink-0 text-orange-700" /><p className="flex-1">This tour lets you inspect realistic workflows without exposing client or tenant data.</p><Link href="/auth?mode=signup" className="inline-flex items-center gap-2 font-bold text-orange-800">Create your workspace <ArrowRight size={15} /></Link></div></div></section>;
}
