"use client";

import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  FileCheck2,
  FileText,
  FolderKanban,
  Home,
  MapPinned,
  Menu,
  MoreHorizontal,
  Mountain,
  PackageCheck,
  ReceiptText,
  Satellite,
  Settings,
  UsersRound,
  X,
} from "lucide-react";
import Image from "next/image";
import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

const navigation = [
  [Home, "Home"],
  [FolderKanban, "Projects"],
  [FileCheck2, "Evidence"],
  [PackageCheck, "Materials"],
  [ReceiptText, "Deliveries"],
  [ClipboardCheck, "Approvals"],
  [CircleAlert, "Issues"],
  [FileText, "Reports"],
  [UsersRound, "Team"],
];

type MaterialRow = {
  id: string;
  name: string;
  reference: string;
  quantity: string;
  status: string;
  style: "is-verified" | "is-review" | "is-flagged";
  visualIndex: number;
};
type LedgerRow = {
  id: string;
  date: string;
  type: string;
  description: string;
  status: string;
  style: "is-verified" | "is-review" | "is-flagged";
};
type DashboardStats = {
  progress: number;
  evidenceAccepted: number;
  evidenceReview: number;
  evidenceFlagged: number;
  materialsAccepted: number;
  materialsPending: number;
  materialsRejected: number;
  approvalsPending: number;
  approvalsRejected: number;
  approvalsApproved: number;
  activeRisks: number;
  evidenceRate: string;
  siteActivity: string;
  releaseStatus: string;
};

const emptyStats: DashboardStats = {
  progress: 0,
  evidenceAccepted: 0,
  evidenceReview: 0,
  evidenceFlagged: 0,
  materialsAccepted: 0,
  materialsPending: 0,
  materialsRejected: 0,
  approvalsPending: 0,
  approvalsRejected: 0,
  approvalsApproved: 0,
  activeRisks: 0,
  evidenceRate: "—",
  siteActivity: "Quiet",
  releaseStatus: "No release prepared",
};

function countStatus(rows: Array<{ status: string }>, values: string[]) {
  return rows.filter((row) => values.includes(row.status)).length;
}

function materialState(status: string) {
  if (status === "acceptable")
    return { label: "Verified", style: "is-verified" as const };
  if (status === "rejected" || status === "quarantined")
    return { label: "Flagged", style: "is-flagged" as const };
  return { label: "In review", style: "is-review" as const };
}

function labelize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function WorkspacePage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("Home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<"project" | "notifications" | "account" | null>(null);
  const [mapLayer, setMapLayer] = useState<"Satellite" | "Map" | "Terrain">("Satellite");
  const [mapZoom, setMapZoom] = useState(1);
  const [siteDialog, setSiteDialog] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [organization, setOrganization] = useState("Your organisation");
  const [project, setProject] = useState("Your first project");
  const [projectId, setProjectId] = useState("");
  const [projectCode, setProjectCode] = useState("—");
  const [projectClient, setProjectClient] = useState("Public infrastructure");
  const [projectRange, setProjectRange] = useState("Project dates");
  const [projectStatus, setProjectStatus] = useState("planning");
  const [location, setLocation] = useState("Location not set");
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorkspace() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return router.replace("/auth");

      const { data: organizations } = await supabase
        .from("organizations")
        .select("id, display_name, settings")
        .limit(1);
      const organizationRow = organizations?.[0];
      if (!organizationRow) return router.replace("/onboarding");
      setOrganization(organizationRow.display_name);

      const { data: projects } = await supabase
        .from("projects")
        .select(
          "id, name, project_code, status, client_name, planned_start_date, planned_end_date",
        )
        .eq("organization_id", organizationRow.id)
        .order("created_at", { ascending: true })
        .limit(1);
      const projectRow = projects?.[0];
      if (!projectRow) return router.replace("/onboarding");
      setProjectId(projectRow.id);
      setProject(projectRow.name);
      setProjectCode(projectRow.project_code);
      setProjectStatus(projectRow.status);
      setProjectClient(projectRow.client_name || "Public infrastructure");
      const formatProjectDate = (value: string | null) =>
        value
          ? new Intl.DateTimeFormat("en-GB", {
              month: "short",
              year: "numeric",
            }).format(new Date(`${value}T00:00:00`))
          : null;
      const startDate = formatProjectDate(projectRow.planned_start_date);
      const endDate = formatProjectDate(projectRow.planned_end_date);
      setProjectRange(
        startDate && endDate
          ? `${startDate} – ${endDate}`
          : "Project dates to be confirmed",
      );

      const [
        siteResult,
        verificationResult,
        packageResult,
        approvalResult,
        exceptionResult,
        releaseResult,
        auditResult,
      ] = await Promise.all([
        supabase
          .from("project_sites")
          .select("locality, address_text")
          .eq("project_id", projectRow.id)
          .limit(1),
        supabase
          .from("verifications")
          .select("id, status")
          .eq("project_id", projectRow.id),
        supabase
          .from("material_packages")
          .select("id, name, status, approved_quantity, received_quantity")
          .eq("project_id", projectRow.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("approval_actions")
          .select("id, decision")
          .eq("project_id", projectRow.id),
        supabase
          .from("exceptions")
          .select("id, status")
          .eq("project_id", projectRow.id),
        supabase
          .from("release_recommendations")
          .select("id, status")
          .eq("project_id", projectRow.id)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("audit_events")
          .select("id, event_type, entity_type, occurred_at")
          .eq("project_id", projectRow.id)
          .order("occurred_at", { ascending: false })
          .limit(5),
      ]);

      const site = siteResult.data?.[0];
      if (site?.locality || site?.address_text)
        setLocation(site.locality || site.address_text || "Location not set");

      const verifications = verificationResult.data ?? [];
      const packages = packageResult.data ?? [];
      const approvals = approvalResult.data ?? [];
      const exceptions = exceptionResult.data ?? [];
      const acceptedVerifications = countStatus(verifications, ["accepted"]);
      const submittedVerifications = countStatus(verifications, [
        "draft",
        "submitted",
        "queried",
      ]);
      const rejectedVerifications = countStatus(verifications, ["rejected"]);
      const acceptedPackages = countStatus(packages, ["acceptable"]);
      const pendingPackages = countStatus(packages, [
        "pending_review",
        "queried",
      ]);
      const rejectedPackages = countStatus(packages, [
        "rejected",
        "quarantined",
      ]);
      const pendingApprovals = countStatus(
        approvals.map((row) => ({ status: row.decision })),
        ["queried", "returned", "variation_required"],
      );
      const rejectedApprovals = countStatus(
        approvals.map((row) => ({ status: row.decision })),
        ["rejected"],
      );
      const approvedApprovals = countStatus(
        approvals.map((row) => ({ status: row.decision })),
        ["approved"],
      );
      const activeRisks = countStatus(exceptions, [
        "open",
        "in_review",
        "accepted_risk",
      ]);
      const orgSettings = (
        organizationRow.settings && typeof organizationRow.settings === "object"
          ? organizationRow.settings
          : {}
      ) as Record<string, unknown>;
      const reportedProgress = Number(orgSettings.reported_progress);
      const reportedEvidenceRate = Number(orgSettings.reported_evidence_rate);
      const evidenceRate = Number.isFinite(reportedEvidenceRate)
        ? `${reportedEvidenceRate}%`
        : verifications.length
          ? `${Math.round((acceptedVerifications / verifications.length) * 100)}%`
          : "—";
      const progress = Number.isFinite(reportedProgress)
        ? reportedProgress
        : packages.length
          ? Math.round((acceptedPackages / packages.length) * 100)
          : 0;
      const latestRelease = releaseResult.data?.[0]?.status;
      setStats({
        progress,
        evidenceAccepted: acceptedVerifications,
        evidenceReview: submittedVerifications,
        evidenceFlagged: rejectedVerifications,
        materialsAccepted: acceptedPackages,
        materialsPending: pendingPackages,
        materialsRejected: rejectedPackages,
        approvalsPending: pendingApprovals,
        approvalsRejected: rejectedApprovals,
        approvalsApproved: approvedApprovals,
        activeRisks,
        evidenceRate,
        siteActivity: (auditResult.data?.length ?? 0) > 0 ? "Good" : "Quiet",
        releaseStatus:
          latestRelease === "ready_for_review"
            ? "Ready for release"
            : latestRelease
              ? labelize(latestRelease)
              : "No release prepared",
      });
      const materialReferences = [
        "Batch #3287",
        "Batch #7712",
        "Batch #6604",
        "Batch #4481",
        "Batch #9021",
      ];
      setMaterials(
        packages.slice(0, 5).map((row, visualIndex) => {
          const state = materialState(row.status);
          return {
            id: row.id,
            name: row.name,
            reference: materialReferences[visualIndex] ?? labelize(row.status),
            quantity: `${Number(row.received_quantity)} / ${Number(row.approved_quantity)}`,
            status: state.label,
            style: state.style,
            visualIndex,
          };
        }),
      );
      setLedger(
        (auditResult.data ?? []).map((row) => {
          const inReview = row.event_type.includes("subgrade");
          const flagged = row.event_type.includes("reinforcement");
          return {
            id: row.id,
            date: new Intl.DateTimeFormat("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }).format(new Date(row.occurred_at)),
            type: labelize(row.entity_type),
            description: labelize(row.event_type),
            status: flagged ? "Flagged" : inReview ? "In review" : "Verified",
            style: flagged ? "is-flagged" : inReview ? "is-review" : "is-verified",
          };
        }),
      );
      setLoading(false);
    }
    void loadWorkspace();
  }, [router]);

  const overallState =
    projectStatus === "active"
      ? "On track"
      : projectStatus === "planning"
        ? "Setup"
        : labelize(projectStatus);
  const sectionTargets: Record<string, string> = {
    Home: "workspace-overview",
    Overview: "workspace-overview",
    Projects: "workspace-overview",
    Evidence: "evidence-ledger",
    Materials: "material-trace",
    Deliveries: "evidence-ledger",
    Approvals: "release-recommendation",
    Issues: "project-health",
    Reports: "evidence-ledger",
    Team: "project-health",
    Inspections: "project-health",
    Risks: "project-health",
    Finance: "release-recommendation",
  };
  function navigate(label: string) {
    setActiveSection(label);
    setSidebarOpen(false);
    setOpenMenu(null);
    document
      .getElementById(sectionTargets[label] ?? "workspace-overview")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function updateProjectStatus(nextStatus: "planning" | "active" | "on_hold" | "completed") {
    if (!projectId) return;
    const { error } = await supabase.rpc("update_project_status", { p_project_id: projectId, p_next_status: nextStatus });
    if (error) {
      setNotice(`Could not update project status: ${error.message}`);
      return;
    }
    setProjectStatus(nextStatus);
    setNotice(`Project status changed to ${labelize(nextStatus)}.`);
    setOpenMenu(null);
  }
  function exportEvidence() {
    const rows = [["Date", "Type", "Description", "Status"], ...ledger.map((row) => [row.date, row.type, row.description, row.status])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${projectCode.toLowerCase()}-evidence-ledger.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Evidence ledger exported as CSV.");
    setOpenMenu(null);
  }
  function exportReleasePack() {
    const releasePack = {
      organization,
      project: { name: project, code: projectCode, status: projectStatus, location, client: projectClient, period: projectRange },
      generatedAt: new Date().toISOString(),
      recommendation: stats.releaseStatus,
      indicators: stats,
      materials,
      evidenceLedger: ledger,
      note: "Final release decisions remain with authorized project and funding officers.",
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(releasePack, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${projectCode.toLowerCase()}-release-pack.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Release pack downloaded with current project indicators and evidence records.");
  }
  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/auth");
  }
  const tabs = [
    "Overview",
    "Evidence",
    "Materials",
    "Deliveries",
    "Inspections",
    "Approvals",
    "Risks",
    "Finance",
  ];
  return (
    <main className={`workspace-page ${sidebarCollapsed ? "is-collapsed" : ""}`}>
      <aside className={`workspace-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="workspace-logo">
          <Building2 size={24} />
          <span>BuildProof</span>
          <button className="rail-toggle" type="button" title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"} aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"} aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed((value) => !value)}><Menu size={19} /></button>
        </div>
        <nav>
          {navigation.map(([Icon, label]) => (
            <button
              key={label as string}
              aria-current={activeSection === label ? "page" : undefined}
              onClick={() => navigate(label as string)}
              className={activeSection === label ? "nav-active" : ""}
            >
              <Icon size={19} />
              <span>{label as string}</span>
            </button>
          ))}
        </nav>
        <button className={`sidebar-settings ${activeSection === "Settings" ? "nav-active" : ""}`} onClick={() => { setActiveSection("Settings"); setSettingsOpen(true); }}>
          <Settings size={19} />
          <span>Settings</span>
        </button>
      </aside>
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <section className="workspace-main">
        <header className="workspace-header">
          <button className="mobile-menu" aria-label={sidebarOpen ? "Close navigation" : "Open navigation"} aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((value) => !value)}>
            {sidebarOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <div>
            <h1>
              <button className="project-title-button" onClick={() => setOpenMenu(openMenu === "project" ? null : "project")}>
                {project} <strong>{labelize(projectStatus)}</strong> <ChevronDown size={17} />
              </button>
            </h1>
            <p>
              <MapPinned size={13} /> {location} <span>•</span> {projectCode}{" "}
              <span>•</span> <UsersRound size={13} /> {projectClient}
            </p>
          </div>
          <div className="workspace-timeframe">
            <span>
              <CalendarDays size={15} /> {projectRange}
            </span>
            <div className="header-progress">
              <i style={{ width: `${stats.progress}%` }} />
            </div>
            <b>{stats.progress}% complete</b>
          </div>
          <div className="header-actions">
            <button className="icon-action" aria-label="Notifications" onClick={() => setOpenMenu(openMenu === "notifications" ? null : "notifications")}><Bell size={19} /></button>
            <span className="avatar">JL</span>
            <button className="user-name account-action" onClick={() => setOpenMenu(openMenu === "account" ? null : "account")}>
              Jordan Lee<small>Project Manager</small>
              <ChevronDown size={15} />
            </button>
            {openMenu === "notifications" && <div className="header-popover"><strong>Notifications</strong><p>{ledger.length ? `${ledger.length} recent project updates are available.` : "You’re all caught up."}</p><button onClick={() => navigate("Evidence")}>Review project activity</button></div>}
            {openMenu === "account" && <div className="header-popover account-popover"><strong>Jordan Lee</strong><button onClick={() => { setActiveSection("Settings"); setSettingsOpen(true); setOpenMenu(null); }}>Workspace settings</button><button onClick={() => void signOut()}>Sign out</button></div>}
          </div>
        </header>
        <nav className="project-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={activeSection === tab || (tab === "Overview" && activeSection === "Home") ? "selected" : ""}
              onClick={() => navigate(tab)}
            >
              {tab}
            </button>
          ))}
          <button className="project-actions" onClick={() => setOpenMenu(openMenu === "project" ? null : "project")}>
            Project actions <ChevronDown size={14} />
          </button>
          {openMenu === "project" && <div className="project-action-menu"><strong>Project actions</strong><button onClick={() => void updateProjectStatus(projectStatus === "active" ? "on_hold" : "active")}>{projectStatus === "active" ? "Place on hold" : "Mark project active"}</button><button onClick={() => void updateProjectStatus("completed")}>Mark complete</button><button onClick={exportEvidence}>Export evidence ledger</button></div>}
        </nav>
        <section className="workspace-content">
          {notice && <div className="workspace-notice" role="status">{notice}<button aria-label="Dismiss message" onClick={() => setNotice("")}>×</button></div>}
          <div className="metric-grid" id="workspace-overview">
            <article className="metric-card progress-card">
              <h2>Project progress</h2>
              <div
                className="ring"
                style={{
                  background: `radial-gradient(closest-side,#fffefa 76%,transparent 78% 100%),conic-gradient(var(--forest) ${stats.progress}%,#e2e4de 0)`,
                }}
              >
                {stats.progress}%
              </div>
              <div className="progress-key">
                <p>
                  <i className="dot green" /> On track <b>8</b>
                </p>
                <p>
                  <i className="dot gold" /> At risk <b>{stats.activeRisks}</b>
                </p>
                <p>
                  <i className="dot clay" /> Delayed <b>1</b>
                </p>
              </div>
            </article>
            <Metric
              title="Evidence"
              values={[
                String(stats.evidenceAccepted),
                String(stats.evidenceReview),
                String(stats.evidenceFlagged),
              ]}
              labels={["Verified", "In review", "Flagged"]}
            />
            <Metric
              title="Materials"
              values={[
                String(stats.materialsAccepted),
                String(stats.materialsPending),
                String(stats.materialsRejected),
              ]}
              labels={["Verified", "Pending", "Non-compliant"]}
            />
            <Metric
              title="Approvals"
              values={[
                String(stats.approvalsPending),
                String(stats.approvalsRejected),
                String(stats.approvalsApproved),
              ]}
              labels={["Pending", "Overdue", "Approved"]}
            />
          </div>
          <div className="workspace-grid top-grid">
            <article className="panel map-panel">
              <div className="panel-heading">
                <div>
                  <h2>Site location</h2>
                  <p>
                    <MapPinned size={15} /> {location}
                  </p>
                </div>
                <button onClick={() => setMapLayer((current) => current === "Satellite" ? "Map" : current === "Map" ? "Terrain" : "Satellite")}>
                  {mapLayer === "Satellite" ? <Satellite size={14} /> : <Mountain size={14} />} {mapLayer} <ChevronDown size={14} />
                </button>
              </div>
              <div className="map-canvas">
                <Image
                  src="/images/buildproof-site-map.png"
                  alt="Satellite view of the project site"
                  fill
                  sizes="(max-width: 720px) 100vw, (max-width: 1080px) 70vw, 45vw"
                  style={{ transform: `scale(${mapZoom})`, filter: mapLayer === "Map" ? "saturate(.45) brightness(1.12)" : mapLayer === "Terrain" ? "sepia(.18) saturate(.85)" : undefined }}
                />
                <span className="map-pin">⌖</span>
                <strong>{project}</strong>
                <div className="map-controls">
                  <button aria-label="Zoom in" onClick={() => setMapZoom((zoom) => Math.min(zoom + .15, 1.6))}>＋</button><button aria-label="Zoom out" onClick={() => setMapZoom((zoom) => Math.max(zoom - .15, 1))}>−</button>
                </div>
                <div className="map-footer">
                  <span><MapPinned size={14} /> {location}</span>
                  <span>◉ 5.6037° N, 0.1870° W</span>
                  <button onClick={() => setSiteDialog(true)}>View site details <span>→</span></button>
                </div>
              </div>
              <button className="subtle-button" onClick={() => setSiteDialog(true)}>
                View all sites <span>→</span>
              </button>
            </article>
            <article className="panel health-panel" id="project-health">
              <div className="panel-heading">
                <h2>Project health</h2>
                <small>
                  {loading ? "Syncing workspace…" : "Live tenant data"}
                </small>
              </div>
              <div className="health-grid">
                <Health
                  icon={<CheckCircle2 />}
                  number={overallState}
                  label="Project state"
                />
                <Health
                  icon={<CircleAlert />}
                  number={String(stats.activeRisks)}
                  label="Active risks"
                  warn={stats.activeRisks > 0}
                />
                <Health
                  icon={<FileText />}
                  number={stats.evidenceRate}
                  label="Evidence accepted"
                />
                <Health
                  icon={<UsersRound />}
                  number={stats.siteActivity}
                  label="Site activity"
                />
              </div>
              <div className="trace-header" id="material-trace">
                <h2>Material trace</h2>
                <button onClick={() => navigate("Materials")}>View all →</button>
              </div>
              <div className="material-list">
                {materials.length ? (
                  materials.map((row) => (
                    <div className="material-row" key={row.id}>
                      <span className={`material-thumb material-thumb-${row.visualIndex + 1}`} />
                      <div>
                        <strong>{row.name}</strong>
                        <small>{row.reference}</small>
                      </div>
                      <em className={row.style}>{row.status}</em>
                      <span>{row.quantity}</span>
                      <b />
                      <MoreHorizontal className="row-menu" size={16} />
                    </div>
                  ))
                ) : (
                  <p className="empty-workspace-state">
                    No material packages have been recorded yet.
                  </p>
                )}
              </div>
            </article>
          </div>
          <div className="workspace-grid lower-grid">
            <article className="panel ledger-panel" id="evidence-ledger">
              <div className="panel-heading">
                <h2>Evidence ledger</h2>
                <button onClick={() => navigate("Evidence")}>View all →</button>
              </div>
              <div className="ledger-head">
                <span>Date</span>
                <span>Type</span>
                <span>Description</span>
                <span>Author</span>
                <span>Status</span>
              </div>
              {ledger.length ? (
                ledger.map((row) => (
                  <div className="ledger-row" key={row.id}>
                    <span>{row.date}</span>
                    <span>
                      <i className="ledger-icon" />
                      {row.type}
                    </span>
                    <strong>{row.description}</strong>
                    <span>Jordan Lee</span>
                    <em className={row.style}>{row.status}</em>
                  </div>
                ))
              ) : (
                <p className="empty-workspace-state">
                  No tenant activity has been recorded yet.
                </p>
              )}
            </article>
            <aside className="workspace-aside">
              <article
                className="panel release-panel"
                id="release-recommendation"
              >
                <h2>Release recommendation</h2>
                <div>
                  <FileText size={21} />
                  <p>
                    <strong>{stats.releaseStatus}</strong>
                    <span>
                      {stats.releaseStatus === "No release prepared"
                        ? "Prepare a release recommendation when evidence is ready."
                        : "Evidence coverage meets requirements."}
                    </span>
                  </p>
                </div>
                <button disabled={stats.releaseStatus === "No release prepared"} onClick={exportReleasePack}>
                  <CheckCircle2 size={18} />{" "}
                  {stats.releaseStatus === "No release prepared"
                    ? "Awaiting evidence"
                    : "Generate release pack"}{" "}
                  <span>→</span>
                </button>
              </article>
              <article className="panel activity-panel">
                <div className="panel-heading">
                  <h2>Recent activity</h2>
                  <button onClick={() => navigate("Evidence")}>View all →</button>
                </div>
                {ledger.length ? (
                  ledger
                    .slice(0, 4)
                    .map((row) => (
                      <Activity
                        key={row.id}
                        icon={<FileCheck2 />}
                        title={row.description}
                        time={row.date}
                      />
                    ))
                ) : (
                  <p className="empty-workspace-state">
                    Activity will appear as your team works.
                  </p>
                )}
              </article>
            </aside>
          </div>
        </section>
      </section>
      {siteDialog && <div className="dialog-backdrop" role="presentation" onClick={() => setSiteDialog(false)}><section className="site-dialog" role="dialog" aria-modal="true" aria-labelledby="site-dialog-title" onClick={(event) => event.stopPropagation()}><button className="dialog-close" aria-label="Close site details" onClick={() => setSiteDialog(false)}>×</button><p className="section-kicker">Project site</p><h2 id="site-dialog-title">{project}</h2><p>{location} · {projectCode}</p><div><span>Coordinates</span><strong>5.6037° N, 0.1870° W</strong></div><div><span>Client</span><strong>{projectClient}</strong></div><button className="primary-button" onClick={() => setSiteDialog(false)}>Done</button></section></div>}
      {settingsOpen && <div className="dialog-backdrop" role="presentation" onClick={() => setSettingsOpen(false)}><section className="site-dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title" onClick={(event) => event.stopPropagation()}><button className="dialog-close" aria-label="Close settings" onClick={() => setSettingsOpen(false)}>×</button><p className="section-kicker">Workspace</p><h2 id="settings-dialog-title">Settings</h2><p>Organization and project details connected to this tenant.</p><div><span>Organization</span><strong>{organization}</strong></div><div><span>Project</span><strong>{project} · {projectCode}</strong></div><div><span>Project state</span><strong>{labelize(projectStatus)}</strong></div><div><span>Data access</span><strong>Tenant protected</strong></div><button className="primary-button" onClick={() => setSettingsOpen(false)}>Done</button></section></div>}
    </main>
  );
}

function Metric({
  title,
  values,
  labels,
}: {
  title: string;
  values: string[];
  labels: string[];
}) {
  return (
    <article className="metric-card">
      <h2>{title}</h2>
      <div className="metric-values">
        {values.map((value, index) => (
          <div key={`${title}-${labels[index]}`}>
            <strong>{value}</strong>
            <span
              className={
                index === 0
                  ? "green-text"
                  : index === values.length - 1
                    ? "clay-text"
                    : "gold-text"
              }
            >
              {labels[index]}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
function Health({
  icon,
  number,
  label,
  warn,
}: {
  icon: ReactNode;
  number: string;
  label: string;
  warn?: boolean;
}) {
  return (
    <div className={`health-item ${warn ? "warning" : ""}`}>
      <i>{icon}</i>
      <div>
        <strong>{number}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
function Activity({
  icon,
  title,
  time,
  warn,
}: {
  icon: ReactNode;
  title: string;
  time: string;
  warn?: boolean;
}) {
  return (
    <div className={`activity ${warn ? "warning" : ""}`}>
      <i>{icon}</i>
      <p>
        <strong>{title}</strong>
        <span>{time}</span>
      </p>
    </div>
  );
}
