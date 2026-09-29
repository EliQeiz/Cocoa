"use client";

import { ArrowRight, Building2, Check, ChevronDown, ClipboardList, FileCog, FolderPlus, Home, Landmark, LockKeyhole, LogOut, PackageCheck, ShieldCheck, UsersRound } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const navigation = [[Home, "Home"], [FolderPlus, "Projects"], [ClipboardList, "Evidence"], [PackageCheck, "Materials"], [PackageCheck, "Deliveries"], [ShieldCheck, "Approvals"], [FileCog, "Reports"]];
const setupSteps = ["Organisation", "Team", "Roles", "Policy", "First project", "Review"];

export default function OnboardingPage() {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("");
  const [organization, setOrganization] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const slug = useMemo(() => slugify(organization), [organization]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.replace("/auth");
      const { data: memberships } = await supabase.from("organization_memberships").select("id").eq("user_id", data.user.id).eq("status", "active").limit(1);
      if (memberships?.length) return router.replace("/workspace");
      setOwnerName(data.user.user_metadata.full_name || data.user.email?.split("@")[0] || "Project owner");
    });
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 6) return setStep((current) => current + 1);
    if (!organization.trim() || !projectName.trim() || !projectCode.trim()) {
      setStatus("error");
      setMessage("Add an organisation name plus your first project name and code before launch.");
      return;
    }
    setStatus("saving");
    setMessage("");
    const { data: organizationId, error: organizationError } = await supabase.rpc("create_organization", { p_legal_name: organization, p_display_name: organization, p_slug: slug, p_owner_display_name: ownerName });
    if (organizationError || !organizationId) {
      setStatus("error");
      setMessage(organizationError?.message || "We could not create your organisation.");
      return;
    }
    const { error: projectError } = await supabase.rpc("create_first_project", { p_organization_id: organizationId, p_project_code: projectCode, p_name: projectName, p_client_name: null });
    if (projectError) {
      setStatus("error");
      setMessage(projectError.message);
      return;
    }
    router.push("/workspace");
  }

  return <main className="onboarding-page"><section className="onboarding-shell">
    <aside className="onboarding-sidebar"><div className="workspace-logo"><Building2 size={24} /><span>BuildProof</span><small>by AuraFlow</small></div><nav>{navigation.map(([Icon, label], index) => <button type="button" className={index === 0 ? "nav-active" : ""} key={label as string}><Icon size={18} /><span>{label as string}</span></button>)}</nav><div className="onboarding-side-copy"><i /><strong>Safer sites</strong><strong>Traceable materials</strong><strong>Stronger communities</strong></div></aside>
    <section className="onboarding-main"><header className="onboarding-topbar"><span><LockKeyhole size={16} /> Secure tenant space</span><button type="button"><LogOut size={16} /> Save and exit</button></header><div className="onboarding-body">
      <section className="onboarding-form-column"><h1>Set up your organisation</h1><p className="lead">Create a secure space for your team and projects.</p><div className="onboarding-progress">{setupSteps.map((label, index) => <button type="button" onClick={() => setStep(index + 1)} className={step === index + 1 ? "active" : step > index + 1 ? "complete" : ""} key={label}><b>{step > index + 1 ? <Check size={13} /> : index + 1}</b><span>{label}</span></button>)}</div>
        <form onSubmit={submit} className="setup-form">
          <SetupCard number={1} active={step === 1} complete={step > 1} icon={<Landmark size={22} />} title="Organisation identity" detail="Tell us about your organisation." status="Completed" onClick={() => setStep(1)}><div className="setup-grid three"><label>Organisation name<input value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder="Ridgeview Construction" /></label><label>Organisation type<select defaultValue="contractor"><option value="contractor">Contractor</option><option value="consultant">Consultant</option><option value="public">Public agency</option></select></label><label>Country<select defaultValue="GH"><option value="GH">🇬🇭 Ghana</option></select></label></div></SetupCard>
          <SetupCard number={2} active={step === 2} complete={step > 2} icon={<UsersRound size={22} />} title="Invite colleagues" detail="Add your team members to this workspace." status={step === 2 ? "In progress" : undefined} onClick={() => setStep(2)}><div className="chip-row"><span>{ownerName || "Project owner"} <b>×</b></span><span>site.team@organisation.org <b>×</b></span><button type="button">＋ Add more</button></div></SetupCard>
          <SetupCard number={3} active={step === 3} complete={step > 3} icon={<ShieldCheck size={22} />} title="Set up roles" detail="Define access and responsibilities." onClick={() => setStep(3)}><div className="role-chips"><span className="selected">✓ Project manager</span><span>Site engineer</span><span>Procurement</span><button type="button">＋ Add role</button></div></SetupCard>
          <SetupCard number={4} active={step === 4} complete={step > 4} icon={<FileCog size={22} />} title="Policy settings" detail="Apply governance and retention rules." onClick={() => setStep(4)}><div className="role-chips"><span>Evidence retention</span><span>Material verification</span><span>Approvals</span></div></SetupCard>
          <SetupCard number={5} active={step === 5} complete={step > 5} icon={<FolderPlus size={22} />} title="Create your first project" detail="Start building your evidence record." onClick={() => setStep(5)}><div className="setup-grid"><label>Project name<input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Northbank Civic Centre" /></label><label>Project code<input value={projectCode} onChange={(event) => setProjectCode(event.target.value)} placeholder="PRJ-1047" /></label></div></SetupCard>
          <SetupCard number={6} active={step === 6} complete={false} icon={<Check size={22} />} title="Review and launch" detail="Confirm your workspace is ready." onClick={() => setStep(6)} />
          {message && <p className="form-message is-error">{message}</p>}<div className="setup-actions"><button type="button" className="secondary-action" disabled={step === 1} onClick={() => setStep((current) => current - 1)}>Back</button><button className="primary-button" disabled={status === "saving"}>{status === "saving" ? "Creating your workspace…" : step === 6 ? <>Launch workspace <ArrowRight size={18} /></> : <>Continue <ArrowRight size={18} /></>}</button></div>
        </form>
      </section>
      <aside className="onboarding-summary"><article className="progress-summary"><h2>Setup progress</h2><div className="summary-progress"><div><b>{Math.round(((step - 1) / 5) * 100)}%</b></div><ol>{setupSteps.map((label, index) => <li className={index + 1 < step ? "done" : index + 1 === step ? "current" : ""} key={label}><i>{index + 1 < step ? <Check size={12} /> : index + 1}</i>{label}</li>)}</ol></div></article><article className="workspace-preview"><div className="panel-heading"><h2>Workspace preview</h2><button type="button">View all →</button></div><img src="/images/buildproof-project-preview.png" alt="Construction project preview" /><h3>{organization || "Your organisation"} <span>Contractor</span></h3><p>⌖ Accra, Greater Accra</p><div className="preview-metrics"><span><b>0</b>Projects</span><span><b>3</b>Team members</span><span><b>—</b>Roles</span><span><b>—</b>Policies</span></div></article><article className="tenant-note-card"><LockKeyhole size={23} /><p><strong>Your data, your organisation</strong><span>All information is isolated to your tenant and only accessible to your authorised team.</span></p></article></aside>
    </div></section>
  </section></main>;
}

function SetupCard({ number, active, complete, icon, title, detail, status, onClick, children }: { number: number; active: boolean; complete: boolean; icon: ReactNode; title: string; detail: string; status?: string; onClick: () => void; children?: ReactNode }) {
  return <section className={`setup-card ${active ? "is-active" : ""} ${complete ? "is-complete" : ""}`}><button className="setup-card-hit" type="button" aria-label={`Open ${title}`} onClick={onClick} /><div className="setup-card-status">{complete ? <Check size={14} /> : number}</div><div className="card-icon">{icon}</div><div className="setup-card-copy"><h2>{title}</h2><p>{detail}</p></div><span className={`setup-state ${status ? "is-progress" : ""}`}>{status ?? "Not started"}</span><ChevronDown className="setup-chevron" size={17} />{children && <div className="setup-card-fields">{children}</div>}</section>;
}
