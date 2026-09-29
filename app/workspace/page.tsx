"use client";

import { Bell, Building2, CheckCircle2, ChevronDown, CircleAlert, ClipboardCheck, FileCheck2, FileText, FolderKanban, Home, MapPinned, Menu, PackageCheck, ReceiptText, Settings, UsersRound } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

const navigation = [[Home, "Home"], [FolderKanban, "Projects"], [FileCheck2, "Evidence"], [PackageCheck, "Materials"], [ReceiptText, "Deliveries"], [ClipboardCheck, "Approvals"], [CircleAlert, "Issues"], [FileText, "Reports"], [UsersRound, "Team"]];

type MaterialRow = { id: string; name: string; reference: string; quantity: string; status: string; style: "is-verified" | "is-review" | "is-flagged" };
type LedgerRow = { id: string; date: string; type: string; description: string; status: string };
type DashboardStats = { progress: number; evidenceAccepted: number; evidenceReview: number; evidenceFlagged: number; materialsAccepted: number; materialsPending: number; materialsRejected: number; approvalsPending: number; approvalsRejected: number; approvalsApproved: number; activeRisks: number; evidenceRate: string; siteActivity: string; releaseStatus: string };

const emptyStats: DashboardStats = { progress: 0, evidenceAccepted: 0, evidenceReview: 0, evidenceFlagged: 0, materialsAccepted: 0, materialsPending: 0, materialsRejected: 0, approvalsPending: 0, approvalsRejected: 0, approvalsApproved: 0, activeRisks: 0, evidenceRate: "—", siteActivity: "Quiet", releaseStatus: "No release prepared" };

function countStatus(rows: Array<{ status: string }>, values: string[]) {
  return rows.filter((row) => values.includes(row.status)).length;
}

function materialState(status: string) {
  if (status === "acceptable") return { label: "Verified", style: "is-verified" as const };
  if (status === "rejected" || status === "quarantined") return { label: "Flagged", style: "is-flagged" as const };
  return { label: "In review", style: "is-review" as const };
}

function labelize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function WorkspacePage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("Overview");
  const [organization, setOrganization] = useState("Your organisation");
  const [project, setProject] = useState("Your first project");
  const [projectCode, setProjectCode] = useState("—");
  const [projectStatus, setProjectStatus] = useState("planning");
  const [location, setLocation] = useState("Location not set");
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorkspace() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace("/auth");

      const { data: organizations } = await supabase.from("organizations").select("id, display_name").limit(1);
      const organizationRow = organizations?.[0];
      if (!organizationRow) return router.replace("/onboarding");
      setOrganization(organizationRow.display_name);

      const { data: projects } = await supabase.from("projects").select("id, name, project_code, status").eq("organization_id", organizationRow.id).order("created_at", { ascending: true }).limit(1);
      const projectRow = projects?.[0];
      if (!projectRow) return router.replace("/onboarding");
      setProject(projectRow.name);
      setProjectCode(projectRow.project_code);
      setProjectStatus(projectRow.status);

      const [siteResult, verificationResult, packageResult, approvalResult, exceptionResult, releaseResult, auditResult] = await Promise.all([
        supabase.from("project_sites").select("locality, address_text").eq("project_id", projectRow.id).limit(1),
        supabase.from("verifications").select("id, status").eq("project_id", projectRow.id),
        supabase.from("material_packages").select("id, name, status, approved_quantity, received_quantity").eq("project_id", projectRow.id).order("created_at", { ascending: false }),
        supabase.from("approval_actions").select("id, decision").eq("project_id", projectRow.id),
        supabase.from("exceptions").select("id, status").eq("project_id", projectRow.id),
        supabase.from("release_recommendations").select("id, status").eq("project_id", projectRow.id).order("created_at", { ascending: false }).limit(1),
        supabase.from("audit_events").select("id, event_type, entity_type, occurred_at").eq("project_id", projectRow.id).order("occurred_at", { ascending: false }).limit(5),
      ]);

      const site = siteResult.data?.[0];
      if (site?.locality || site?.address_text) setLocation(site.locality || site.address_text || "Location not set");

      const verifications = verificationResult.data ?? [];
      const packages = packageResult.data ?? [];
      const approvals = approvalResult.data ?? [];
      const exceptions = exceptionResult.data ?? [];
      const acceptedVerifications = countStatus(verifications, ["accepted"]);
      const submittedVerifications = countStatus(verifications, ["draft", "submitted", "queried"]);
      const rejectedVerifications = countStatus(verifications, ["rejected"]);
      const acceptedPackages = countStatus(packages, ["acceptable"]);
      const pendingPackages = countStatus(packages, ["pending_review", "queried"]);
      const rejectedPackages = countStatus(packages, ["rejected", "quarantined"]);
      const pendingApprovals = countStatus(approvals.map((row) => ({ status: row.decision })), ["queried", "returned", "variation_required"]);
      const rejectedApprovals = countStatus(approvals.map((row) => ({ status: row.decision })), ["rejected"]);
      const approvedApprovals = countStatus(approvals.map((row) => ({ status: row.decision })), ["approved"]);
      const activeRisks = countStatus(exceptions, ["open", "in_review", "accepted_risk"]);
      const evidenceRate = verifications.length ? `${Math.round((acceptedVerifications / verifications.length) * 100)}%` : "—";
      const progress = packages.length ? Math.round((acceptedPackages / packages.length) * 100) : 0;
      setStats({ progress, evidenceAccepted: acceptedVerifications, evidenceReview: submittedVerifications, evidenceFlagged: rejectedVerifications, materialsAccepted: acceptedPackages, materialsPending: pendingPackages, materialsRejected: rejectedPackages, approvalsPending: pendingApprovals, approvalsRejected: rejectedApprovals, approvalsApproved: approvedApprovals, activeRisks, evidenceRate, siteActivity: (auditResult.data?.length ?? 0) > 0 ? "Active" : "Quiet", releaseStatus: releaseResult.data?.[0] ? labelize(releaseResult.data[0].status) : "No release prepared" });
      setMaterials(packages.slice(0, 5).map((row) => {
        const state = materialState(row.status);
        return { id: row.id, name: row.name, reference: labelize(row.status), quantity: `${Number(row.received_quantity)} / ${Number(row.approved_quantity)}`, status: state.label, style: state.style };
      }));
      setLedger((auditResult.data ?? []).map((row) => ({ id: row.id, date: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(row.occurred_at)), type: labelize(row.entity_type), description: labelize(row.event_type), status: "Recorded" })));
      setLoading(false);
    }
    void loadWorkspace();
  }, [router]);

  const overallState = projectStatus === "active" ? "On track" : projectStatus === "planning" ? "Setup" : labelize(projectStatus);
  const sectionTargets: Record<string, string> = { Overview: "workspace-overview", Projects: "workspace-overview", Evidence: "evidence-ledger", Materials: "material-trace", Deliveries: "evidence-ledger", Approvals: "release-recommendation", Issues: "project-health", Reports: "evidence-ledger", Team: "project-health", Inspections: "project-health", Risks: "project-health", Finance: "release-recommendation" };
  function navigate(label: string) { setActiveSection(label); document.getElementById(sectionTargets[label] ?? "workspace-overview")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  const tabs = ["Overview", "Evidence", "Materials", "Deliveries", "Inspections", "Approvals", "Risks", "Finance"];
  return <main className="workspace-page"><aside className="workspace-sidebar"><div className="workspace-logo"><Building2 size={24} /><span>BuildProof</span></div><nav>{navigation.map(([Icon, label]) => <button key={label as string} aria-current={activeSection === label ? "page" : undefined} onClick={() => navigate(label as string)} className={activeSection === label ? "nav-active" : ""}><Icon size={19} /><span>{label as string}</span></button>)}</nav><button className="sidebar-settings" onClick={() => navigate("Team")}><Settings size={19} /><span>Settings</span></button></aside><section className="workspace-main"><header className="workspace-header"><button className="mobile-menu"><Menu size={21} /></button><div><h1>{project} <ChevronDown size={17} /></h1><p><MapPinned size={13} /> {location} <span>•</span> {projectCode} <strong>{labelize(projectStatus)}</strong></p></div><div className="header-actions"><Bell size={19} /><span className="avatar">AA</span><div className="user-name">{organization}<ChevronDown size={15} /></div></div></header><nav className="project-tabs">{tabs.map((tab) => <button key={tab} className={activeSection === tab ? "selected" : ""} onClick={() => navigate(tab)}>{tab}</button>)}<span className="completion">Material readiness <b>{stats.progress}%</b></span></nav><section className="workspace-content"><div className="metric-grid" id="workspace-overview"><article className="metric-card progress-card"><h2>Project progress</h2><div className="ring" style={{ background: `radial-gradient(closest-side,#fffefa 76%,transparent 78% 100%),conic-gradient(var(--forest) ${stats.progress}%,#e2e4de 0)` }}>{stats.progress}%</div><div className="progress-key"><p><i className="dot green" /> {overallState}</p><p><i className="dot gold" /> {stats.activeRisks} active risks</p><p><i className="dot clay" /> {stats.materialsRejected} flagged materials</p></div></article><Metric title="Evidence" values={[String(stats.evidenceAccepted), String(stats.evidenceReview), String(stats.evidenceFlagged)]} labels={["Verified", "In review", "Flagged"]} /><Metric title="Materials" values={[String(stats.materialsAccepted), String(stats.materialsPending), String(stats.materialsRejected)]} labels={["Verified", "Pending", "Non-compliant"]} /><Metric title="Approvals" values={[String(stats.approvalsPending), String(stats.approvalsRejected), String(stats.approvalsApproved)]} labels={["Pending", "Overdue", "Approved"]} /></div><div className="workspace-grid top-grid"><article className="panel map-panel"><div className="panel-heading"><div><h2>Site location</h2><p><MapPinned size={15} /> {location}</p></div><button>Satellite <ChevronDown size={14} /></button></div><div className="map-canvas"><img src="/images/buildproof-site-map.png" alt="Satellite view of the project site" /><span className="map-pin">⌖</span><strong>{project}</strong><div className="map-controls">＋<br />−</div></div><button className="subtle-button">View all sites <span>→</span></button></article><article className="panel health-panel" id="project-health"><div className="panel-heading"><h2>Project health</h2><small>{loading ? "Syncing workspace…" : "Live tenant data"}</small></div><div className="health-grid"><Health icon={<CheckCircle2 />} number={overallState} label="Project state" /><Health icon={<CircleAlert />} number={String(stats.activeRisks)} label="Active risks" warn={stats.activeRisks > 0} /><Health icon={<FileText />} number={stats.evidenceRate} label="Evidence accepted" /><Health icon={<UsersRound />} number={stats.siteActivity} label="Site activity" /></div><div className="trace-header" id="material-trace"><h2>Material trace</h2><button>View all →</button></div><div className="material-list">{materials.length ? materials.map((row) => <div className="material-row" key={row.id}><span className="material-thumb" /><div><strong>{row.name}</strong><small>{row.reference}</small></div><em className={row.style}>{row.status}</em><span>{row.quantity}</span><b /></div>) : <p className="empty-workspace-state">No material packages have been recorded yet.</p>}</div></article></div><div className="workspace-grid lower-grid"><article className="panel ledger-panel" id="evidence-ledger"><div className="panel-heading"><h2>Evidence ledger</h2><button>View all →</button></div><div className="ledger-head"><span>Date</span><span>Type</span><span>Description</span><span>Author</span><span>Status</span></div>{ledger.length ? ledger.map((row) => <div className="ledger-row" key={row.id}><span>{row.date}</span><span><i className="ledger-icon" />{row.type}</span><strong>{row.description}</strong><span>Workspace</span><em className="is-verified">{row.status}</em></div>) : <p className="empty-workspace-state">No tenant activity has been recorded yet.</p>}</article><aside className="workspace-aside"><article className="panel release-panel" id="release-recommendation"><h2>Release recommendation</h2><div><FileText size={21} /><p><strong>{stats.releaseStatus}</strong><span>{stats.releaseStatus === "No release prepared" ? "Prepare a release recommendation when evidence is ready." : "Release state is synced from the workspace."}</span></p></div><button disabled={stats.releaseStatus === "No release prepared"}><CheckCircle2 size={18} /> {stats.releaseStatus === "No release prepared" ? "Awaiting evidence" : "View release"} <span>→</span></button></article><article className="panel activity-panel"><div className="panel-heading"><h2>Recent activity</h2><button>View all →</button></div>{ledger.length ? ledger.slice(0, 4).map((row) => <Activity key={row.id} icon={<FileCheck2 />} title={row.description} time={row.date} />) : <p className="empty-workspace-state">Activity will appear as your team works.</p>}</article></aside></div></section></section></main>;
}

function Metric({ title, values, labels }: { title: string; values: string[]; labels: string[] }) { return <article className="metric-card"><h2>{title}</h2><div className="metric-values">{values.map((value, index) => <div key={`${title}-${labels[index]}`}><strong>{value}</strong><span className={index === 0 ? "green-text" : index === values.length - 1 ? "clay-text" : "gold-text"}>{labels[index]}</span></div>)}</div></article>; }
function Health({ icon, number, label, warn }: { icon: ReactNode; number: string; label: string; warn?: boolean }) { return <div className={`health-item ${warn ? "warning" : ""}`}><i>{icon}</i><div><strong>{number}</strong><span>{label}</span></div></div>; }
function Activity({ icon, title, time, warn }: { icon: ReactNode; title: string; time: string; warn?: boolean }) { return <div className={`activity ${warn ? "warning" : ""}`}><i>{icon}</i><p><strong>{title}</strong><span>{time}</span></p></div>; }
