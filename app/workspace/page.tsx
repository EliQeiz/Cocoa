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
import { ReactNode, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";
import { normalizeEmail, normalizePlainText } from "../../lib/security/input";

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
type InspectionReviewRow = {
  id: string;
  submitted_by: string;
  observed_quantity: number;
  unit: string | null;
  findings: string;
  created_at: string;
  material_packages: { name: string } | null;
  material_batches: { manufacturer_batch_reference: string | null } | null;
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
  const [organizationId, setOrganizationId] = useState("");
  const [project, setProject] = useState("Your first project");
  const [projectId, setProjectId] = useState("");
  const [suiteName, setSuiteName] = useState<string | null>(null);
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
      setOrganizationId(organizationRow.id);
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
  };
  function navigate(label: string) {
    setActiveSection(label);
    setSidebarOpen(false);
    setOpenMenu(null);
    setSuiteName(label === "Home" || label === "Overview" ? null : label);
    if (label !== "Home" && label !== "Overview") return;
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
        <button className={`sidebar-settings ${activeSection === "Settings" ? "nav-active" : ""}`} onClick={() => { setSuiteName(null); setActiveSection("Settings"); setSettingsOpen(true); }}>
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
            {openMenu === "account" && <div className="header-popover account-popover"><strong>Jordan Lee</strong><button onClick={() => { setSuiteName(null); setActiveSection("Settings"); setSettingsOpen(true); setOpenMenu(null); }}>Workspace settings</button><button onClick={() => void signOut()}>Sign out</button></div>}
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
        {suiteName ? (
          <SuiteWorkspace
            key={`${suiteName}-${projectId}-${organizationId}`}
            module={suiteName}
            projectId={projectId}
            organizationId={organizationId}
            onBack={() => navigate("Home")}
          />
        ) : <section className="workspace-content">
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
        </section>}
      </section>
      {siteDialog && <div className="dialog-backdrop" role="presentation" onClick={() => setSiteDialog(false)}><section className="site-dialog" role="dialog" aria-modal="true" aria-labelledby="site-dialog-title" onClick={(event) => event.stopPropagation()}><button className="dialog-close" aria-label="Close site details" onClick={() => setSiteDialog(false)}>×</button><p className="section-kicker">Project site</p><h2 id="site-dialog-title">{project}</h2><p>{location} · {projectCode}</p><div><span>Coordinates</span><strong>5.6037° N, 0.1870° W</strong></div><div><span>Client</span><strong>{projectClient}</strong></div><button className="primary-button" onClick={() => setSiteDialog(false)}>Done</button></section></div>}
      {settingsOpen && <div className="dialog-backdrop" role="presentation" onClick={() => setSettingsOpen(false)}><section className="site-dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title" onClick={(event) => event.stopPropagation()}><button className="dialog-close" aria-label="Close settings" onClick={() => setSettingsOpen(false)}>×</button><p className="section-kicker">Workspace</p><h2 id="settings-dialog-title">Settings</h2><p>Organization and project details connected to this tenant.</p><div><span>Organization</span><strong>{organization}</strong></div><div><span>Project</span><strong>{project} · {projectCode}</strong></div><div><span>Project state</span><strong>{labelize(projectStatus)}</strong></div><div><span>Data access</span><strong>Tenant protected</strong></div><button className="primary-button" onClick={() => setSettingsOpen(false)}>Done</button></section></div>}
    </main>
  );
}

const suiteDefinitions: Record<string, { title: string; description: string; table: "projects" | "verifications" | "material_packages" | "deliveries" | "approval_actions" | "exceptions" | "audit_events" | "organization_memberships" | "release_recommendations"; columns: string; scope: "project" | "organization" }> = {
  Projects: { title: "Projects", description: "Project register and delivery status for this organisation.", table: "projects", columns: "id, project_code, name, status, client_name, planned_start_date, planned_end_date", scope: "organization" },
  Evidence: { title: "Evidence", description: "Capture and review field proof attached to project deliveries.", table: "verifications", columns: "id, status, unit, findings, verified_at, created_at", scope: "project" },
  Materials: { title: "Materials", description: "Approved quantities, receipts and verification status by package.", table: "material_packages", columns: "id, package_code, name, status, approved_quantity, received_quantity, verified_quantity", scope: "project" },
  Deliveries: { title: "Deliveries", description: "Inbound delivery records and receiving details.", table: "deliveries", columns: "id, delivery_reference, status, vehicle_reference, received_at, notes, created_at", scope: "project" },
  Approvals: { title: "Approvals", description: "Recorded approval decisions and their rationale.", table: "approval_actions", columns: "id, decision, rationale, acted_at, created_at", scope: "project" },
  Issues: { title: "Issues", description: "Open exceptions, ownership and due dates requiring attention.", table: "exceptions", columns: "id, title, severity, status, due_at, description, created_at", scope: "project" },
  Reports: { title: "Reports", description: "A filterable activity ledger from the tenant audit trail.", table: "audit_events", columns: "id, occurred_at, event_type, entity_type, source", scope: "project" },
  Team: { title: "Team", description: "Organisation members and their current access roles.", table: "organization_memberships", columns: "id, user_id, role, status, invited_at, accepted_at", scope: "organization" },
  Inspections: { title: "Inspections", description: "Inspection and verification records awaiting or completing review.", table: "verifications", columns: "id, status, unit, findings, verified_at, created_at", scope: "project" },
  Risks: { title: "Risks", description: "Project exceptions and risk items recorded by the team.", table: "exceptions", columns: "id, title, severity, status, due_at, description, created_at", scope: "project" },
  Finance: { title: "Finance", description: "Release recommendations prepared for authorised financial review.", table: "release_recommendations", columns: "id, recommendation_number, status, recommended_amount, currency_code, rationale, created_at", scope: "project" },
};

function SuiteWorkspace({ module, projectId, organizationId, onBack }: { module: string; projectId: string; organizationId: string; onBack: () => void }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<Array<{ id: string; request_number: string; status: string; purpose: string | null; needed_by_date: string | null; requested_at: string; purchase_request_lines?: Array<{ description: string; requested_quantity: number; unit: string }> }>>([]);
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [inspectionQueue, setInspectionQueue] = useState<InspectionReviewRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState<Record<string, string>>({});
  const [savingInspection, setSavingInspection] = useState("");
  const [batchOptions, setBatchOptions] = useState<Array<{ id: string; reference: string; received_quantity: number; unit: string }>>([]);
  const [packageOptions, setPackageOptions] = useState<Array<{ id: string; name: string; unit: string; approved_quantity: number; received_quantity: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingRequest, setSavingRequest] = useState("");
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", severity: "medium", dueAt: "", deliveryReference: "", vehicleReference: "", manufacturerBatch: "", certificateReference: "", notes: "", packageId: "", batchId: "", quantity: "", unit: "", findings: "", recommendationNumber: "", amount: "", currency: "GHS", rationale: "", requestNumber: "", itemDescription: "", requestQuantity: "", requestUnit: "", neededBy: "", requestPurpose: "", estimatedRate: "" });
  const definition = suiteDefinitions[module];
  const createLabel: Record<string, string> = { Materials: "Request material", Deliveries: "Receive delivery", Issues: "Raise issue", Risks: "Record risk", Inspections: "Submit inspection", Finance: "Prepare recommendation", Team: "Invite colleague" };
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("engineer");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteRecords, setInviteRecords] = useState<Array<{ id: string; email: string; role: string; expires_at: string; accepted_at: string | null; revoked_at: string | null; expired: boolean }>>([]);
  const [savingInvitation, setSavingInvitation] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadCurrentUser() {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) setCurrentUserId(data.user?.id ?? "");
    }
    void loadCurrentUser();
    return () => { cancelled = true; };
  }, []);

  const fetchRecords = useCallback(async () => {
    if (!definition || !projectId || !organizationId) return { data: [] as unknown as Record<string, unknown>[], error: "" };
    let result;
    switch (definition.table) {
      case "projects": result = await supabase.from("projects").select(definition.columns).eq("organization_id", organizationId).order("created_at", { ascending: false }); break;
      case "verifications": result = await supabase.from("verifications").select(definition.columns).eq("project_id", projectId).order("created_at", { ascending: false }); break;
      case "material_packages": result = await supabase.from("material_packages").select(definition.columns).eq("project_id", projectId).order("created_at", { ascending: false }); break;
      case "deliveries": result = await supabase.from("deliveries").select(definition.columns).eq("project_id", projectId).order("created_at", { ascending: false }); break;
      case "approval_actions": result = await supabase.from("approval_actions").select(definition.columns).eq("project_id", projectId).order("created_at", { ascending: false }); break;
      case "exceptions": result = await supabase.from("exceptions").select(definition.columns).eq("project_id", projectId).order("created_at", { ascending: false }); break;
      case "audit_events": result = await supabase.from("audit_events").select(definition.columns).eq("project_id", projectId).order("occurred_at", { ascending: false }); break;
      case "organization_memberships": result = await supabase.from("organization_memberships").select(definition.columns).eq("organization_id", organizationId).order("created_at", { ascending: false }); break;
      case "release_recommendations": result = await supabase.from("release_recommendations").select(definition.columns).eq("project_id", projectId).order("created_at", { ascending: false }); break;
    }
    return { data: (result.data ?? []) as unknown as Record<string, unknown>[], error: result.error?.message ?? "" };
  }, [definition, organizationId, projectId]);
  const loadInvitations = useCallback(async () => {
    if (module !== "Team" || !organizationId) return;
    const { data, error: invitationError } = await supabase.from("organization_invitations").select("id, email, role, expires_at, accepted_at, revoked_at").eq("organization_id", organizationId).order("created_at", { ascending: false });
    if (invitationError) setError(invitationError.message);
    else setInviteRecords((data ?? []).map((invite) => ({ ...invite, expired: new Date(invite.expires_at).getTime() < Date.now() })));
  }, [module, organizationId]);
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const result = await fetchRecords();
      if (cancelled) return;
      setRows(result.data);
      setError(result.error);
      setLoading(false);
    }
    void refresh();
    return () => { cancelled = true; };
  }, [fetchRecords]);
  useEffect(() => {
    if (module !== "Team" || !organizationId) return;
    let cancelled = false;
    async function refreshInvitations() {
      const { data, error: invitationError } = await supabase.from("organization_invitations").select("id, email, role, expires_at, accepted_at, revoked_at").eq("organization_id", organizationId).order("created_at", { ascending: false });
      if (cancelled) return;
      if (invitationError) setError(invitationError.message);
      else setInviteRecords((data ?? []).map((invite) => ({ ...invite, expired: new Date(invite.expires_at).getTime() < Date.now() })));
    }
    void refreshInvitations();
    return () => { cancelled = true; };
  }, [module, organizationId]);
  const loadPackages = useCallback(async () => {
    if ((module !== "Inspections" && module !== "Deliveries") || !projectId) return [] as Array<{ id: string; name: string; unit: string; approved_quantity: number; received_quantity: number }>;
    const { data } = await supabase.from("material_packages").select("id, name, approved_quantity, received_quantity, boq_lines!inner(unit, boq_versions!inner(status))").eq("project_id", projectId).eq("boq_lines.boq_versions.status", "approved").order("name");
    return (data ?? []).map((row) => {
      const line = Array.isArray(row.boq_lines) ? row.boq_lines[0] : row.boq_lines;
      return { id: row.id, name: row.name, unit: line?.unit ?? "units", approved_quantity: Number(row.approved_quantity), received_quantity: Number(row.received_quantity) };
    });
  }, [module, projectId]);
  useEffect(() => {
    if (module !== "Inspections" && module !== "Deliveries") return;
    let cancelled = false;
    async function refreshPackages() {
      const options = await loadPackages();
      if (!cancelled) setPackageOptions(options);
    }
    void refreshPackages();
    return () => { cancelled = true; };
  }, [loadPackages, module]);
  useEffect(() => {
    let cancelled = false;
    async function refreshBatches() {
      if (module !== "Inspections" || !form.packageId) {
        if (!cancelled) setBatchOptions([]);
        return;
      }
      const { data } = await supabase.from("material_batches").select("id, manufacturer_batch_reference, delivery_lines!inner(received_quantity, unit)").eq("project_id", projectId).eq("material_package_id", form.packageId).eq("status", "pending_review").order("created_at", { ascending: false });
      if (cancelled) return;
      const batches = (data ?? []).map((row) => {
        const line = Array.isArray(row.delivery_lines) ? row.delivery_lines[0] : row.delivery_lines;
        return { id: row.id, reference: row.manufacturer_batch_reference || "Unlabelled batch", received_quantity: Number(line?.received_quantity ?? 0), unit: line?.unit ?? "units" };
      });
      setBatchOptions(batches);
      setForm((current) => ({ ...current, batchId: batches.some((batch) => batch.id === current.batchId) ? current.batchId : "" }));
    }
    void refreshBatches();
    return () => { cancelled = true; };
  }, [form.packageId, module, projectId]);
  const loadPurchaseRequests = useCallback(async () => {
    if ((module !== "Approvals" && module !== "Materials") || !projectId) return [];
    let query = supabase.from("purchase_requests").select("id, request_number, status, purpose, needed_by_date, requested_at, purchase_request_lines(description, requested_quantity, unit)").eq("project_id", projectId);
    if (module === "Approvals") query = query.in("status", ["submitted", "under_review", "queried"]);
    const { data } = await query.order("created_at", { ascending: false });
    return (data ?? []) as unknown as typeof purchaseRequests;
  }, [module, projectId]);
  const loadInspectionQueue = useCallback(async () => {
    if (module !== "Approvals" || !projectId) return [];
    const { data } = await supabase.from("verifications").select("id, submitted_by, observed_quantity, unit, findings, created_at, material_packages!inner(name), material_batches(manufacturer_batch_reference)").eq("project_id", projectId).eq("status", "submitted").not("submitted_by", "is", null).order("created_at", { ascending: true });
    return (data ?? []) as unknown as InspectionReviewRow[];
  }, [module, projectId]);
  useEffect(() => {
    let cancelled = false;
    async function refreshRequests() {
      const [requests, inspections] = await Promise.all([loadPurchaseRequests(), loadInspectionQueue()]);
      if (!cancelled) setPurchaseRequests(requests);
      if (!cancelled) setInspectionQueue(inspections);
    }
    void refreshRequests();
    return () => { cancelled = true; };
  }, [loadInspectionQueue, loadPurchaseRequests]);
  async function loadRecords() {
    setLoading(true);
    const result = await fetchRecords();
    setRows(result.data);
    setError(result.error);
    setLoading(false);
  }
  async function createRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    let command;
    let parameters: Record<string, unknown>;
    if (module === "Materials") {
      command = "submit_material_purchase_request";
      parameters = { p_project_id: projectId, p_request_number: normalizePlainText(form.requestNumber, 48), p_description: normalizePlainText(form.itemDescription, 500), p_requested_quantity: Number(form.requestQuantity), p_unit: normalizePlainText(form.requestUnit, 24), p_needed_by_date: form.neededBy || null, p_purpose: normalizePlainText(form.requestPurpose, 2000), p_estimated_unit_rate: form.estimatedRate ? Number(form.estimatedRate) : null };
    } else if (module === "Issues" || module === "Risks") {
      command = "create_project_exception";
      parameters = { p_project_id: projectId, p_title: normalizePlainText(form.title, 180), p_description: normalizePlainText(form.description, 4000), p_severity: form.severity, p_due_at: form.dueAt ? new Date(`${form.dueAt}T23:59:59Z`).toISOString() : null };
    } else if (module === "Deliveries") {
      command = "receive_project_material_delivery";
      parameters = { p_project_id: projectId, p_material_package_id: form.packageId, p_received_quantity: Number(form.quantity), p_delivery_reference: normalizePlainText(form.deliveryReference, 120), p_vehicle_reference: normalizePlainText(form.vehicleReference, 120), p_manufacturer_batch_reference: normalizePlainText(form.manufacturerBatch, 120), p_certificate_reference: normalizePlainText(form.certificateReference, 160), p_condition_notes: normalizePlainText(form.notes, 2000) };
    } else if (module === "Inspections") {
      command = "create_project_batch_inspection";
      parameters = { p_project_id: projectId, p_material_package_id: form.packageId, p_material_batch_id: form.batchId, p_observed_quantity: Number(form.quantity), p_findings: normalizePlainText(form.findings, 4000), p_project_site_id: null };
    } else if (module === "Finance") {
      command = "create_project_release_recommendation";
      parameters = { p_project_id: projectId, p_recommendation_number: normalizePlainText(form.recommendationNumber, 48), p_recommended_amount: form.amount ? Number(form.amount) : null, p_currency_code: form.currency, p_rationale: normalizePlainText(form.rationale, 4000) };
    } else {
      setSaving(false);
      return;
    }
    try {
      const { error: commandError } = await supabase.rpc(command, parameters as never);
      if (commandError) {
        setError(commandError.message);
      } else {
        setSuccess(`${createLabel[module]} saved to the project record.`);
        setCreateOpen(false);
        setForm({ title: "", description: "", severity: "medium", dueAt: "", deliveryReference: "", vehicleReference: "", manufacturerBatch: "", certificateReference: "", notes: "", packageId: "", batchId: "", quantity: "", unit: "", findings: "", recommendationNumber: "", amount: "", currency: "GHS", rationale: "", requestNumber: "", itemDescription: "", requestQuantity: "", requestUnit: "", neededBy: "", requestPurpose: "", estimatedRate: "" });
        await loadRecords();
        if (module === "Deliveries") setPackageOptions(await loadPackages());
        if (module === "Materials") setPurchaseRequests(await loadPurchaseRequests());
      }
    } catch (commandError) {
      setError(commandError instanceof Error ? commandError.message : "The command could not be completed.");
    } finally {
      setSaving(false);
    }
  }
  async function createTeamInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    setInviteLink("");
    const { data, error: invitationError } = await supabase.rpc("create_organization_invitation", {
      p_organization_id: organizationId,
      p_email: normalizeEmail(inviteEmail),
      p_role: inviteRole,
    });
    if (invitationError || !data?.[0]?.invite_token) {
      setError(invitationError?.message ?? "The invitation could not be created.");
    } else {
      const link = `${window.location.origin}/auth?invite=${encodeURIComponent(data[0].invite_token)}`;
      setInviteLink(link);
      setInviteEmail("");
      setSuccess("Invitation created. Copy the secure link and share it with the invited colleague. It expires in 7 days.");
      await loadInvitations();
    }
    setSaving(false);
  }
  async function revokeTeamInvitation(invitationId: string) {
    setSavingInvitation(invitationId);
    setError("");
    setSuccess("");
    const { error: revokeError } = await supabase.rpc("revoke_organization_invitation", { p_invitation_id: invitationId });
    if (revokeError) setError(revokeError.message);
    else {
      setSuccess("Invitation revoked. Its link can no longer be used.");
      await loadInvitations();
    }
    setSavingInvitation("");
  }
  function setFormValue(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  async function decideRequest(requestId: string, decision: "approved" | "queried" | "rejected" | "returned" | "variation_required") {
    const rationale = normalizePlainText(approvalNotes[requestId] ?? "", 4000);
    if (rationale.length < 3) {
      setError("Add a decision rationale before recording this approval action.");
      return;
    }
    setSavingRequest(requestId);
    setError("");
    setSuccess("");
    const { error: commandError } = await supabase.rpc("decide_purchase_request", { p_purchase_request_id: requestId, p_decision: decision, p_rationale: rationale });
    if (commandError) {
      setError(commandError.message);
    } else {
      setSuccess(`Request ${labelize(decision)} and saved to the approval history.`);
      setApprovalNotes((current) => ({ ...current, [requestId]: "" }));
      setPurchaseRequests(await loadPurchaseRequests());
      await loadRecords();
    }
    setSavingRequest("");
  }
  async function decideInspection(verificationId: string, decision: "accepted" | "rejected") {
    const rationale = normalizePlainText(inspectionNotes[verificationId] ?? "", 4000);
    if (rationale.length < 3) {
      setError("Add a review rationale before recording the inspection decision.");
      return;
    }
    setSavingInspection(verificationId);
    setError("");
    setSuccess("");
    const { error: reviewError } = await supabase.rpc("review_project_inspection", { p_verification_id: verificationId, p_decision: decision, p_rationale: rationale });
    if (reviewError) setError(reviewError.message);
    else {
      setSuccess(`Inspection ${decision} and saved to the audit history.`);
      setInspectionNotes((current) => ({ ...current, [verificationId]: "" }));
      setInspectionQueue(await loadInspectionQueue());
      await loadRecords();
    }
    setSavingInspection("");
  }

  if (!definition) return null;
  const visibleRows = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(filter.toLowerCase()));
  function downloadRows() {
    const keys = definition.columns.split(", ").filter((key) => key !== "id");
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [keys.map(escape).join(","), ...visibleRows.map((row) => keys.map((key) => escape(row[key])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${module.toLowerCase()}-records.csv`; anchor.click(); URL.revokeObjectURL(url);
  }
  return <section className="workspace-content suite-workspace">
    <div className="suite-heading"><div><p className="section-kicker">Project suite</p><h2>{definition.title}</h2><p>{definition.description}</p></div><button className="suite-back" onClick={onBack}>← Project overview</button></div>
    <div className="suite-toolbar"><label><span className="sr-only">Filter {definition.title.toLowerCase()}</span><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={`Filter ${definition.title.toLowerCase()}…`} /></label><span>{visibleRows.length} records</span>{createLabel[module] && <button className="suite-create-button" onClick={() => { setCreateOpen((open) => !open); setError(""); setSuccess(""); }}>{createOpen ? "Cancel" : `+ ${createLabel[module]}`}</button>}<button onClick={() => void loadRecords()} disabled={loading}>Refresh</button><button onClick={downloadRows} disabled={!visibleRows.length}>Export CSV</button></div>
    {success && <p className="suite-success" role="status">{success}</p>}
    {error && <p className="suite-error" role="alert">{createOpen ? "This action could not be saved:" : "Couldn’t load these tenant records:"} {error}</p>}
    {module === "Evidence" && <EvidenceCapture projectId={projectId} organizationId={organizationId} />}
    {module === "Team" && inviteLink && <section className="team-invite-result"><strong>Secure invitation link</strong><p>This one-time link is bound to the invited email and expires in seven days. Share it through your normal company channel.</p><div><input aria-label="Secure invitation link" readOnly value={inviteLink} /><button type="button" onClick={() => void navigator.clipboard.writeText(inviteLink).then(() => setSuccess("Invitation link copied."), () => setError("Could not copy automatically. Select and copy the link."))}>Copy link</button></div></section>}
    {createOpen && module === "Team" && <form className="suite-create-form" onSubmit={(event) => void createTeamInvitation(event)}>
      <div className="suite-create-title"><div><strong>Invite a colleague</strong><p>Creates an email-bound invitation link. BuildProof will not send email automatically.</p></div><button type="button" aria-label="Close form" onClick={() => setCreateOpen(false)}>×</button></div>
      <label>Colleague email<input required type="email" maxLength={254} value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="name@organisation.org" /></label>
      <label>Workspace role<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}><option value="engineer">Site engineer</option><option value="site_receiver">Site receiver</option><option value="contractor_manager">Contractor manager</option><option value="quantity_surveyor">Quantity surveyor</option><option value="finance_reviewer">Finance reviewer</option><option value="project_director">Project director</option><option value="funder_viewer">Funder viewer</option><option value="organization_admin">Organisation administrator</option></select></label>
      <button className="suite-save-button" type="submit" disabled={saving}>{saving ? "Creating invitation…" : "Create invitation link"}</button>
    </form>}
    {createOpen && module !== "Team" && <form className="suite-create-form" onSubmit={(event) => void createRecord(event)}>
      <div className="suite-create-title"><div><strong>{createLabel[module]}</strong><p>Saved through an authenticated, role-checked command.</p></div><button type="button" aria-label="Close form" onClick={() => setCreateOpen(false)}>×</button></div>
      {(module === "Issues" || module === "Risks") && <>
        <label>Issue title<input required minLength={3} maxLength={180} value={form.title} onChange={(event) => setFormValue("title", event.target.value)} /></label>
        <label>Description<textarea required minLength={3} maxLength={4000} rows={3} value={form.description} onChange={(event) => setFormValue("description", event.target.value)} /></label>
        <div className="suite-form-row"><label>Severity<select value={form.severity} onChange={(event) => setFormValue("severity", event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label><label>Due date<input type="date" value={form.dueAt} onChange={(event) => setFormValue("dueAt", event.target.value)} /></label></div>
      </>}
      {module === "Deliveries" && <>
        <label>Material package<select required value={form.packageId} onChange={(event) => setFormValue("packageId", event.target.value)}><option value="">Select an approved package</option>{packageOptions.map((item) => <option key={item.id} value={item.id}>{item.name} · {Math.max(0, item.approved_quantity - item.received_quantity)} {item.unit} available</option>)}</select></label>
        <div className="suite-form-row"><label>Delivery reference<input required minLength={2} maxLength={120} placeholder="e.g. GHA-DEL-2841" value={form.deliveryReference} onChange={(event) => setFormValue("deliveryReference", event.target.value)} /></label><label>Vehicle / truck reference<input maxLength={120} value={form.vehicleReference} onChange={(event) => setFormValue("vehicleReference", event.target.value)} /></label></div>
        <div className="suite-form-row"><label>Received quantity<input required type="number" min="0.001" step="0.001" max={packageOptions.find((item) => item.id === form.packageId) ? Math.max(0, packageOptions.find((item) => item.id === form.packageId)!.approved_quantity - packageOptions.find((item) => item.id === form.packageId)!.received_quantity) : undefined} value={form.quantity} onChange={(event) => setFormValue("quantity", event.target.value)} />{packageOptions.find((item) => item.id === form.packageId) && <small>Unit: {packageOptions.find((item) => item.id === form.packageId)?.unit}</small>}</label><label>Manufacturer batch reference<input maxLength={120} value={form.manufacturerBatch} onChange={(event) => setFormValue("manufacturerBatch", event.target.value)} /></label><label>Certificate reference<input maxLength={160} value={form.certificateReference} onChange={(event) => setFormValue("certificateReference", event.target.value)} /></label></div>
        <label>Receiving condition / notes<textarea required minLength={3} rows={3} maxLength={2000} value={form.notes} onChange={(event) => setFormValue("notes", event.target.value)} placeholder="Describe the received condition, discrepancies or inspection notes" /></label>
        {!packageOptions.length && <p className="suite-form-hint">This project needs an approved Bill of Quantities material package before you can receive materials.</p>}
      </>}
      {module === "Materials" && <>
        <div className="suite-form-row"><label>Request number<input required minLength={2} maxLength={48} value={form.requestNumber} onChange={(event) => setFormValue("requestNumber", event.target.value)} /></label><label>Needed by<input type="date" value={form.neededBy} onChange={(event) => setFormValue("neededBy", event.target.value)} /></label></div>
        <label>Material or service<input required minLength={2} maxLength={500} value={form.itemDescription} onChange={(event) => setFormValue("itemDescription", event.target.value)} /></label>
        <div className="suite-form-row"><label>Quantity<input required type="number" min="0.001" step="0.001" value={form.requestQuantity} onChange={(event) => setFormValue("requestQuantity", event.target.value)} /></label><label>Unit<input required maxLength={24} placeholder="e.g. bags, tonnes" value={form.requestUnit} onChange={(event) => setFormValue("requestUnit", event.target.value)} /></label><label>Est. unit rate<input type="number" min="0" step="0.01" value={form.estimatedRate} onChange={(event) => setFormValue("estimatedRate", event.target.value)} /></label></div>
        <label>Purpose / specification<input maxLength={2000} value={form.requestPurpose} onChange={(event) => setFormValue("requestPurpose", event.target.value)} /></label>
      </>}
      {module === "Inspections" && <>
        <label>Material package<select required value={form.packageId} onChange={(event) => { setFormValue("packageId", event.target.value); setFormValue("batchId", ""); }}><option value="">Select a project package</option>{packageOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Received batch<select required value={form.batchId} onChange={(event) => setFormValue("batchId", event.target.value)}><option value="">Select an uninspected batch</option>{batchOptions.map((batch) => <option key={batch.id} value={batch.id}>{batch.reference} · {batch.received_quantity} {batch.unit}</option>)}</select></label>
        <label>Quantity inspected<input required type="number" min="0.001" step="0.001" max={batchOptions.find((batch) => batch.id === form.batchId)?.received_quantity} value={form.quantity} onChange={(event) => setFormValue("quantity", event.target.value)} />{batchOptions.find((batch) => batch.id === form.batchId) && <small>Batch unit: {batchOptions.find((batch) => batch.id === form.batchId)?.unit}. Acceptance requires inspection of the full received quantity.</small>}</label>
        <label>Inspection findings<textarea required minLength={3} maxLength={4000} rows={3} value={form.findings} onChange={(event) => setFormValue("findings", event.target.value)} /></label>
        {!packageOptions.length && <p className="suite-form-hint">Add a material package and record a delivery before submitting an inspection.</p>}
        {packageOptions.length > 0 && form.packageId && !batchOptions.length && <p className="suite-form-hint">There are no uninspected batches for this package. Record a new delivery first.</p>}
      </>}
      {module === "Finance" && <>
        <div className="suite-form-row"><label>Recommendation number<input required minLength={2} maxLength={48} value={form.recommendationNumber} onChange={(event) => setFormValue("recommendationNumber", event.target.value)} /></label><label>Amount<input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setFormValue("amount", event.target.value)} /></label><label>Currency<select value={form.currency} onChange={(event) => setFormValue("currency", event.target.value)}><option value="GHS">GHS</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></label></div>
        <label>Rationale<textarea required minLength={3} maxLength={4000} rows={3} value={form.rationale} onChange={(event) => setFormValue("rationale", event.target.value)} /></label>
      </>}
      <button className="suite-save-button" type="submit" disabled={saving || (module === "Deliveries" && !packageOptions.length) || (module === "Inspections" && (!packageOptions.length || !batchOptions.length))}>{saving ? "Saving…" : module === "Deliveries" ? "Record receipt" : module === "Inspections" ? "Submit for review" : "Save record"}</button>
    </form>}
    {module === "Approvals" && <>
      <section className="approval-queue" aria-labelledby="approval-queue-title">
        <div className="approval-queue-heading"><div><h3 id="approval-queue-title">Procurement requests</h3><p>Each decision updates the request and writes to the approval and audit history.</p></div><button onClick={async () => setPurchaseRequests(await loadPurchaseRequests())}>Refresh queue</button></div>
        {purchaseRequests.length ? <div className="approval-request-list">{purchaseRequests.map((request) => <article className="approval-request" key={request.id}><div><strong>{request.request_number}</strong><span className={`request-status request-${request.status}`}>{labelize(request.status)}</span></div>{request.purchase_request_lines?.map((line, index) => <p key={`${request.id}-line-${index}`}><strong>{line.description}</strong> · {line.requested_quantity} {line.unit}</p>)}<p>{request.purpose || "No additional purpose provided."}</p>{request.needed_by_date && <small>Needed by {request.needed_by_date}</small>}<label>Decision rationale<textarea required minLength={3} rows={2} value={approvalNotes[request.id] ?? ""} onChange={(event) => setApprovalNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Record the reason for this decision" /></label><div className="approval-actions"><button disabled={savingRequest === request.id} onClick={() => void decideRequest(request.id, "approved")}>Approve request</button><button disabled={savingRequest === request.id} onClick={() => void decideRequest(request.id, "queried")}>Request changes</button><button disabled={savingRequest === request.id} onClick={() => void decideRequest(request.id, "rejected")}>Reject</button></div></article>)}</div> : <p className="suite-empty-queue">No purchase requests are awaiting a decision.</p>}
      </section>
      <section className="approval-queue" aria-labelledby="inspection-queue-title">
        <div className="approval-queue-heading"><div><h3 id="inspection-queue-title">Independent inspection review</h3><p>Reviewers cannot accept or reject inspections they submitted. Decisions update batch status and verified quantities.</p></div><button onClick={async () => setInspectionQueue(await loadInspectionQueue())}>Refresh queue</button></div>
        {inspectionQueue.length ? <div className="approval-request-list">{inspectionQueue.map((inspection) => <article className="approval-request" key={inspection.id}><div><strong>{inspection.material_packages?.name ?? "Material inspection"}</strong><span className="request-status request-submitted">Awaiting review</span></div><p><strong>Batch:</strong> {inspection.material_batches?.manufacturer_batch_reference || "Unlabelled batch"} · {inspection.observed_quantity} {inspection.unit ?? "units"}</p><p>{inspection.findings}</p><small>Submitted {new Date(inspection.created_at).toLocaleString()}</small>{inspection.submitted_by === currentUserId ? <p className="suite-form-hint">You submitted this inspection. Another authorized reviewer must make the decision.</p> : <><label>Review rationale<textarea required minLength={3} rows={2} value={inspectionNotes[inspection.id] ?? ""} onChange={(event) => setInspectionNotes((current) => ({ ...current, [inspection.id]: event.target.value }))} placeholder="Record inspection findings and the basis for your decision" /></label><div className="approval-actions"><button disabled={savingInspection === inspection.id} onClick={() => void decideInspection(inspection.id, "accepted")}>Accept batch</button><button disabled={savingInspection === inspection.id} onClick={() => void decideInspection(inspection.id, "rejected")}>Reject batch</button></div></>}</article>)}</div> : <p className="suite-empty-queue">No inspections are awaiting independent review.</p>}
      </section>
    </>}
    {module === "Materials" && purchaseRequests.length > 0 && <section className="material-request-log"><h3>Purchase requests</h3>{purchaseRequests.map((request) => <div key={request.id}><strong>{request.request_number}</strong><span>{request.purchase_request_lines?.map((line) => `${line.description} · ${line.requested_quantity} ${line.unit}`).join(", ") || request.purpose || "Material request"}</span><em className={`request-status request-${request.status}`}>{labelize(request.status)}</em></div>)}</section>}
    {module === "Team" && <section className="approval-queue team-invitation-list"><div className="approval-queue-heading"><div><h3>Workspace invitations</h3><p>Invitation status is visible only to members of this tenant.</p></div><button onClick={() => void loadInvitations()}>Refresh invitations</button></div>{inviteRecords.length ? <div className="suite-table-wrap"><table className="suite-table"><thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Expires</th><th>Action</th></tr></thead><tbody>{inviteRecords.map((invitation) => <tr key={invitation.id}><td>{invitation.email}</td><td>{labelize(invitation.role)}</td><td>{invitation.accepted_at ? "Accepted" : invitation.revoked_at ? "Revoked" : invitation.expired ? "Expired" : "Pending"}</td><td>{new Date(invitation.expires_at).toLocaleDateString()}</td><td>{!invitation.accepted_at && !invitation.revoked_at && !invitation.expired && <button className="team-revoke-button" disabled={savingInvitation === invitation.id} onClick={() => void revokeTeamInvitation(invitation.id)}>{savingInvitation === invitation.id ? "Revoking…" : "Revoke"}</button>}</td></tr>)}</tbody></table></div> : <p className="suite-empty-queue">No invitations have been created yet.</p>}</section>}
    <div className="suite-table-wrap"><table className="suite-table"><thead><tr>{definition.columns.split(", ").filter((key) => key !== "id").map((key) => <th key={key}>{labelize(key)}</th>)}</tr></thead><tbody>
      {loading ? <tr><td colSpan={definition.columns.split(", ").length}>Loading {definition.title.toLowerCase()}…</td></tr> : visibleRows.length ? visibleRows.map((row) => <tr key={String(row.id)}>{definition.columns.split(", ").filter((key) => key !== "id").map((key) => <td key={key}>{row[key] == null || row[key] === "" ? "—" : String(row[key])}</td>)}</tr>) : <tr><td colSpan={definition.columns.split(", ").length}>No {definition.title.toLowerCase()} records found for this project yet.</td></tr>}
    </tbody></table></div>
    <p className="suite-footnote">Records are read from your signed-in tenant under its row-level access rules. Changes to controlled records are reserved for audited, role-checked actions.</p>
  </section>;
}

type DeliveryChoice = { id: string; delivery_reference: string | null; vehicle_reference: string | null; status: string };
type EvidenceRecord = {
  id: string;
  caption: string | null;
  created_at: string;
  filename: string;
  mime_type: string;
  byte_size: number;
  sha256: string;
  delivery: string;
  signed_url: string | null;
};

function EvidenceCapture({ projectId, organizationId }: { projectId: string; organizationId: string }) {
  const [deliveries, setDeliveries] = useState<DeliveryChoice[]>([]);
  const [records, setRecords] = useState<EvidenceRecord[]>([]);
  const [deliveryId, setDeliveryId] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchEvidence = useCallback(async () => {
    const [deliveryResult, evidenceResult] = await Promise.all([
      supabase.from("deliveries").select("id, delivery_reference, vehicle_reference, status").eq("project_id", projectId).neq("status", "void").order("created_at", { ascending: false }),
      supabase.from("evidence_links").select("id, caption, created_at, subject_id, evidence_assets!inner(object_path, original_filename, mime_type, byte_size, sha256)").eq("project_id", projectId).eq("subject_type", "delivery").order("created_at", { ascending: false }),
    ]);
    const nextDeliveries = (deliveryResult.data ?? []) as DeliveryChoice[];
    let nextError = deliveryResult.error?.message ?? "";
    let nextRecords: EvidenceRecord[] = [];
    if (evidenceResult.error) {
      nextError = evidenceResult.error.message;
    } else {
      const links = (evidenceResult.data ?? []) as unknown as Array<{
        id: string;
        caption: string | null;
        created_at: string;
        subject_id: string;
        evidence_assets: { object_path: string; original_filename: string; mime_type: string; byte_size: number; sha256: string };
      }>;
      nextRecords = await Promise.all(links.map(async (link) => {
        const asset = Array.isArray(link.evidence_assets) ? link.evidence_assets[0] : link.evidence_assets;
        const { data } = await supabase.storage.from("buildproof-evidence").createSignedUrl(asset.object_path, 3600);
        const delivery = (deliveryResult.data ?? []).find((row) => row.id === link.subject_id) as DeliveryChoice | undefined;
        return {
          id: link.id,
          caption: link.caption,
          created_at: link.created_at,
          filename: asset.original_filename,
          mime_type: asset.mime_type,
          byte_size: asset.byte_size,
          sha256: asset.sha256,
          delivery: delivery?.delivery_reference || delivery?.vehicle_reference || "Project delivery",
          signed_url: data?.signedUrl ?? null,
        };
      }));
    }
    return { deliveries: nextDeliveries, records: nextRecords, error: nextError };
  }, [projectId]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchEvidence();
    setDeliveries(result.deliveries);
    setRecords(result.records);
    setError(result.error);
    setLoading(false);
  }, [fetchEvidence]);

  useEffect(() => {
    let cancelled = false;
    async function refreshEvidence() {
      const result = await fetchEvidence();
      if (cancelled) return;
      setDeliveries(result.deliveries);
      setRecords(result.records);
      setError(result.error);
      setLoading(false);
    }
    void refreshEvidence();
    return () => { cancelled = true; };
  }, [fetchEvidence]);

  async function uploadEvidence(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !deliveryId) return;
    setSaving(true);
    setError("");
    setNotice("");
    let objectPath = "";
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Your session has expired. Sign in again to upload evidence.");
      if (!new Set(["image/jpeg", "image/png", "application/pdf"]).has(file.type) || file.size > 25 * 1024 * 1024) {
        throw new Error("Choose a JPEG, PNG or PDF no larger than 25 MB.");
      }
      if (!globalThis.crypto?.subtle) throw new Error("This browser cannot calculate the evidence checksum securely.");
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "pdf";
      objectPath = `${organizationId}/${projectId}/${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("buildproof-evidence").upload(objectPath, file, { contentType: file.type, cacheControl: "3600", upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      const { error: registerError } = await supabase.rpc("register_delivery_evidence", {
        p_project_id: projectId,
        p_delivery_id: deliveryId,
        p_object_path: objectPath,
        p_original_filename: normalizePlainText(file.name, 255),
        p_mime_type: file.type,
        p_byte_size: file.size,
        p_sha256: sha256,
        p_caption: normalizePlainText(caption, 1000),
      });
      if (registerError) {
        await supabase.storage.from("buildproof-evidence").remove([objectPath]);
        throw new Error(registerError.message);
      }
      setFile(null);
      setCaption("");
      const input = document.getElementById("evidence-file-input") as HTMLInputElement | null;
      if (input) input.value = "";
      setNotice("Evidence uploaded, linked to the delivery and recorded in the audit history.");
      await load();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The evidence file could not be uploaded.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="evidence-capture" aria-labelledby="evidence-capture-title">
    <div className="evidence-capture-heading"><div><p className="section-kicker">Field record</p><h3 id="evidence-capture-title">Delivery evidence</h3><p>Attach site photos or signed documents to a delivery. Files remain private to this organisation.</p></div><button type="button" onClick={() => { setLoading(true); void load(); }} disabled={loading}>Refresh</button></div>
    {notice && <p className="suite-success" role="status">{notice}</p>}
    {error && <p className="suite-error" role="alert">{error}</p>}
    <form className="evidence-upload-form" onSubmit={(event) => void uploadEvidence(event)}>
      <label>Project delivery<select required value={deliveryId} onChange={(event) => setDeliveryId(event.target.value)}><option value="">Select a delivery</option>{deliveries.map((delivery) => <option key={delivery.id} value={delivery.id}>{delivery.delivery_reference || "Unreferenced delivery"}{delivery.vehicle_reference ? ` · ${delivery.vehicle_reference}` : ""} · {labelize(delivery.status)}</option>)}</select></label>
      <label>Evidence file<input id="evidence-file-input" required type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><small>JPEG, PNG or PDF · up to 25 MB</small></label>
      <label>What does this show?<textarea required minLength={3} maxLength={1000} rows={2} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Describe what the evidence records" /></label>
      <button className="suite-save-button" type="submit" disabled={saving || !deliveries.length}>{saving ? "Uploading and recording…" : "Upload evidence"}</button>
      {!deliveries.length && <p className="suite-form-hint">Register a delivery first. Evidence must be connected to a project record.</p>}
    </form>
    <div className="evidence-record-list"><h4>Recorded evidence <span>{records.length}</span></h4>{loading ? <p className="evidence-empty">Loading secure evidence records…</p> : records.length ? records.map((record) => <article className="evidence-record" key={record.id}><div className="evidence-record-file"><FileCheck2 size={18} aria-hidden="true" /><div><strong>{record.filename}</strong><span>{record.delivery} · {(record.byte_size / 1024 / 1024).toFixed(2)} MB</span></div></div><p>{record.caption}</p><small>SHA-256 · {record.sha256.slice(0, 16)}… · {new Date(record.created_at).toLocaleString()}</small>{record.signed_url && <a href={record.signed_url} target="_blank" rel="noreferrer">Open secure preview</a>}</article>) : <p className="evidence-empty">No evidence has been attached to a delivery in this project yet.</p>}</div>
  </section>;
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
