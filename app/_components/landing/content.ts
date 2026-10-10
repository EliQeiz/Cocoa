import {
  BadgeCheck,
  Building2,
  Camera,
  ClipboardCheck,
  FileArchive,
  FileCheck2,
  FlaskConical,
  HardHat,
  KeyRound,
  Landmark,
  PackageCheck,
  Scale,
  ShieldCheck,
  TriangleAlert,
  Truck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

export const navigation = [
  { label: "Why BuildProof", href: "#why" },
  { label: "Workflow", href: "#workflow" },
  { label: "Platform", href: "#platform" },
  { label: "For Teams", href: "#teams" },
  { label: "Security", href: "#security" },
  { label: "Pilot Programme", href: "#pilot" },
] as const;

export const audiences = [
  { label: "Contractors", icon: HardHat },
  { label: "Developers", icon: Building2 },
  { label: "QA/QC teams", icon: ClipboardCheck },
  { label: "Consultants", icon: Scale },
  { label: "Project owners", icon: Landmark },
] as const;

export const problems = [
  { title: "Fragmented evidence", description: "Photographs, test certificates and inspection notes sit in separate folders, phones and message threads.", indicator: "Records disconnected", icon: Camera, tone: "orange" as const },
  { title: "Unverified deliveries", description: "Materials arrive on site before the approved source, batch and supporting documents are checked together.", indicator: "Trace incomplete", icon: Truck, tone: "sky" as const },
  { title: "Delayed decisions", description: "Reviewers chase missing context while approvals, exceptions and release decisions wait in different systems.", indicator: "Action pending", icon: TriangleAlert, tone: "amber" as const },
] as const;

export const workflowStages = [
  {
    number: "01", title: "Set the Standard", short: "Approved requirements",
    description: "Define scope, quantities, material specifications, inspection points and acceptance criteria before work starts.",
    icon: ClipboardCheck, status: "Standard issued", panelTitle: "C35 concrete · structural works", panelMeta: "ITP line 2.4 · Rev 03",
    evidence: ["Approved quantity · 450 m³", "Test frequency · 1 set / 50 m³", "Hold point · consultant witness"],
  },
  {
    number: "02", title: "Capture from Site", short: "Delivery and field proof",
    description: "Link delivery notes, site photographs, batches, locations and responsible people to the correct work package.",
    icon: Camera, status: "Evidence captured", panelTitle: "Delivery DN-184 · Batch #3287", panelMeta: "Northbank Civic Centre · Grid B4",
    evidence: ["42 m³ recorded", "4 geotagged photographs", "Supplier certificate attached"],
  },
  {
    number: "03", title: "Resolve Exceptions", short: "Issues before release",
    description: "Surface missing proof, failed checks and non-compliance while the delivery team can still take corrective action.",
    icon: TriangleAlert, status: "Exception resolved", panelTitle: "NCR-014 · cube result review", panelMeta: "Assigned to QA/QC · due 14 Apr",
    evidence: ["7-day result reviewed", "Corrective note accepted", "Consultant response recorded"],
  },
  {
    number: "04", title: "Release with Confidence", short: "Controlled acceptance",
    description: "Prepare the release decision from a complete chain of approved scope, evidence, tests, exceptions and sign-off.",
    icon: FileCheck2, status: "Ready for review", panelTitle: "Release pack · Level 02 structure", panelMeta: "Evidence coverage · 18 of 18 records",
    evidence: ["Material trace complete", "Inspection points accepted", "Approval history included"],
  },
] as const;

export const capabilities = [
  { title: "Material traceability", description: "Follow approved materials from request and delivery through testing, acceptance and final release.", outcome: "Know exactly what entered the works.", icon: PackageCheck, tone: "orange" as const, size: "wide" as const },
  { title: "Site evidence", description: "Capture photographs, notes, authorship and location against the correct package—not a loose camera roll.", outcome: "Keep field proof in context.", icon: Camera, tone: "sky" as const, size: "standard" as const },
  { title: "Quality inspections", description: "Connect ITP checkpoints, observations and test results to the work they verify.", outcome: "Review quality without reconstruction.", icon: FlaskConical, tone: "sky" as const, size: "standard" as const },
  { title: "Exception management", description: "Assign non-compliance, missing records and corrective actions with a visible decision trail.", outcome: "Resolve issues before handover.", icon: TriangleAlert, tone: "amber" as const, size: "standard" as const },
  { title: "Approval controls", description: "Route evidence to the right professional and preserve comments, status and responsibility.", outcome: "Make acceptance authority explicit.", icon: BadgeCheck, tone: "green" as const, size: "standard" as const },
  { title: "Release packs", description: "Assemble accepted evidence, quality records and approvals into one controlled package for release or handover.", outcome: "Move from activity to a defensible record.", icon: FileArchive, tone: "navy" as const, size: "wide" as const },
] as const;

export const evidenceChain = [
  { label: "Material requested", meta: "Approved C35", icon: ClipboardCheck },
  { label: "Delivered", meta: "DN-184", icon: Truck },
  { label: "Inspected", meta: "ITP 2.4", icon: Camera },
  { label: "Tested", meta: "Cube set 07", icon: FlaskConical },
  { label: "Exception resolved", meta: "NCR-014", icon: TriangleAlert },
  { label: "Approved", meta: "Consultant", icon: BadgeCheck },
  { label: "In release pack", meta: "Level 02", icon: FileArchive },
] as const;

export const roles = [
  { id: "project-managers", label: "Project Managers", icon: UsersRound, summary: "See progress, open risks and pending decisions across the active project.", sees: ["Evidence coverage by package", "Exceptions affecting programme", "Approval queues and responsibility"], records: "Project actions, owners and release readiness", approves: "Release recommendations and management actions", previewTitle: "Project control view" },
  { id: "qa-qc", label: "QA/QC Teams", icon: ShieldCheck, summary: "Work from the inspection and evidence record instead of rebuilding it at month end.", sees: ["ITP checkpoints and test status", "Missing or rejected evidence", "Material batches awaiting review"], records: "Inspections, test results and corrective evidence", approves: "Quality acceptance within assigned authority", previewTitle: "Quality review queue" },
  { id: "quantity-surveyors", label: "Quantity Surveyors", icon: Scale, summary: "Connect measured work and material records to the evidence supporting commercial review.", sees: ["Approved scope and quantities", "Delivery records by package", "Evidence behind completed work"], records: "Commercial observations and quantity checks", approves: "Package evidence for valuation review", previewTitle: "Scope and quantity record" },
  { id: "project-owners", label: "Project Owners", icon: Landmark, summary: "Receive a clear view of readiness and the basis behind critical project decisions.", sees: ["Programme-level evidence health", "Unresolved high-impact exceptions", "Release and handover status"], records: "Owner decisions and governance notes", approves: "Controlled milestones and final releases", previewTitle: "Owner assurance view" },
] as const;

export const securityFeatures = [
  { title: "Role-based access", description: "Workspace permissions follow project responsibility and review authority.", icon: UserRoundCheck },
  { title: "Tenant isolation", description: "Organisation records remain within their authorised tenant and project boundary.", icon: ShieldCheck },
  { title: "Traceable actions", description: "Critical changes retain the responsible person, time, status and context.", icon: FileCheck2 },
  { title: "Evidence custody", description: "Records stay connected to their source, package and controlled review state.", icon: KeyRound },
  { title: "Controlled approvals", description: "Approval authority is explicit, reviewable and preserved with the decision.", icon: BadgeCheck },
] as const;

export const pilotSteps = [
  { number: "01", title: "Baseline the project", description: "Agree the current workflow, evidence gaps and measures that matter." },
  { number: "02", title: "Configure one workflow", description: "Set up one live work package with its evidence and approval rules." },
  { number: "03", title: "Onboard the delivery team", description: "Give the people doing and reviewing the work a clear operating routine." },
  { number: "04", title: "Measure the change", description: "Report evidence completeness, exception resolution and release preparation." },
] as const;

export const footerGroups = [
  { title: "Product", links: [{ label: "Workflow", href: "#workflow" }, { label: "Platform", href: "#platform" }, { label: "For Teams", href: "#teams" }, { label: "Security", href: "#security" }] },
  { title: "Company", links: [{ label: "Why BuildProof", href: "#why" }, { label: "Pilot Programme", href: "#pilot" }, { label: "Contact", href: "mailto:elishaafari0@gmail.com" }] },
  { title: "Access", links: [{ label: "Sign in", href: "/auth" }, { label: "Privacy", href: "#security" }, { label: "Security", href: "#security" }] },
] as const;
