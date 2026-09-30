"use client";

import { ArrowRight, Building2, Check, ChevronDown, ClipboardList, FileCog, FolderPlus, Home, Landmark, LockKeyhole, LogOut, PackageCheck, ShieldCheck, UsersRound, X } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../lib/supabase/client";

type Draft = { organization: string; organizationType: string; country: string; projectName: string; projectCode: string; invites: string[]; roles: string[]; policies: string[]; step: number };
const setupSteps = ["Organisation", "Team", "Roles", "Policy", "First project", "Review"];
const navigation = [[Home, "Home", 1], [FolderPlus, "Projects", 5], [ClipboardList, "Evidence", 4], [PackageCheck, "Materials", 4], [PackageCheck, "Deliveries", 5], [ShieldCheck, "Approvals", 4], [FileCog, "Reports", 6]] as const;
const initialDraft: Draft = { organization: "", organizationType: "contractor", country: "GH", projectName: "", projectCode: "", invites: [], roles: ["Project manager"], policies: ["Evidence retention"], step: 1 };

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function toggle(values: string[], value: string) { return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]; }

export default function OnboardingPage() {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("Project owner");
  const [draftKey, setDraftKey] = useState("");
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [inviteEmail, setInviteEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const [createdInviteLinks, setCreatedInviteLinks] = useState<Array<{ email: string; url: string }>>([]);
  const [organizationReady, setOrganizationReady] = useState(false);
  const slug = useMemo(() => slugify(draft.organization), [draft.organization]);
  const update = (values: Partial<Draft>) => setDraft((current) => ({ ...current, ...values }));

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.replace("/auth");
      const { data: memberships } = await supabase.from("organization_memberships").select("id").eq("user_id", data.user.id).eq("status", "active").limit(1);
      if (memberships?.length) return router.replace("/workspace");
      const key = `buildproof:onboarding:${data.user.id}`;
      setDraftKey(key);
      setOwnerName(data.user.user_metadata.full_name || data.user.email?.split("@")[0] || "Project owner");
      const saved = window.localStorage.getItem(key);
      if (saved) try { setDraft({ ...initialDraft, ...JSON.parse(saved) }); } catch { window.localStorage.removeItem(key); }
    });
  }, [router]);

  useEffect(() => { if (draftKey) window.localStorage.setItem(draftKey, JSON.stringify(draft)); }, [draft, draftKey]);

  function moveTo(nextStep: number) { setMessage(""); setStatus("idle"); update({ step: Math.max(1, Math.min(6, nextStep)) }); }
  function addInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setStatus("error"); setMessage("Enter a valid colleague email address first."); return; }
    if (!draft.invites.includes(email)) update({ invites: [...draft.invites, email] });
    setInviteEmail(""); setMessage(""); setStatus("idle");
  }
  async function saveAndExit() { if (draftKey) window.localStorage.setItem(draftKey, JSON.stringify(draft)); await supabase.auth.signOut(); router.replace("/auth"); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (organizationReady) return router.replace("/workspace");
    if (draft.step < 6) return moveTo(draft.step + 1);
    if (!draft.organization.trim() || !draft.projectName.trim() || !draft.projectCode.trim()) { setStatus("error"); setMessage("Add an organisation name and your first project name and code before launch."); return; }
    setStatus("saving"); setMessage("");
    const { data: organizationId, error: organizationError } = await supabase.rpc("create_organization", { p_legal_name: draft.organization, p_display_name: draft.organization, p_slug: slug, p_owner_display_name: ownerName });
    if (organizationError || !organizationId) { setStatus("error"); setMessage(organizationError?.message || "We could not create your organisation."); return; }
    const { error: projectError } = await supabase.rpc("create_first_project", { p_organization_id: organizationId, p_project_code: draft.projectCode, p_name: draft.projectName, p_client_name: null });
    if (projectError) { setStatus("error"); setMessage(projectError.message); return; }
    const createdLinks: Array<{ email: string; url: string }> = [];
    for (const email of draft.invites) {
      const { data, error: inviteError } = await supabase.rpc("create_organization_invitation", { p_organization_id: organizationId, p_email: email, p_role: "engineer" });
      if (inviteError || !data?.[0]?.invite_token) {
        setStatus("error");
        setMessage(`Your workspace and first project are ready, but an invitation for ${email} could not be created: ${inviteError?.message ?? "No invite link was returned."}`);
        setCreatedInviteLinks(createdLinks);
        setOrganizationReady(true);
        if (draftKey) window.localStorage.removeItem(draftKey);
        return;
      }
      createdLinks.push({ email, url: `${window.location.origin}/auth?invite=${encodeURIComponent(data[0].invite_token)}` });
    }
    if (draftKey) window.localStorage.removeItem(draftKey);
    if (createdLinks.length) {
      setCreatedInviteLinks(createdLinks);
      setOrganizationReady(true);
      setStatus("idle");
      setMessage("Your workspace is ready. Copy each secure invitation link and share it with the invited colleague.");
      return;
    }
    router.replace("/workspace");
  }

  const progress = Math.round(((draft.step - 1) / 5) * 100);
  const team = [ownerName, ...draft.invites];
  return <main className="onboarding-page"><section className="onboarding-shell">
    <aside className="onboarding-sidebar"><div className="onboarding-brand"><Building2 size={27} /><span>BuildProof<small>by AuraFlow</small></span></div><nav aria-label="Workspace setup navigation">{navigation.map(([Icon, label, targetStep]) => <button type="button" className={draft.step === targetStep ? "nav-active" : ""} onClick={() => moveTo(targetStep)} key={label}><Icon size={18} /><span>{label}</span></button>)}</nav><div className="onboarding-side-copy"><i /><strong>Safer sites</strong><strong>Traceable materials</strong><strong>Stronger communities</strong></div></aside>
    <section className="onboarding-main"><header className="onboarding-topbar"><span><LockKeyhole size={16} /> Secure tenant space</span><button type="button" onClick={() => void saveAndExit()}><LogOut size={16} /> Save and exit</button></header><div className="onboarding-body">
      <section className="onboarding-form-column"><h1>Set up your organisation</h1><p className="lead">Create a secure space for your team and projects.</p><div className="onboarding-progress" aria-label="Setup progress">{setupSteps.map((label, index) => <button type="button" onClick={() => moveTo(index + 1)} className={draft.step === index + 1 ? "active" : draft.step > index + 1 ? "complete" : ""} key={label}><b>{draft.step > index + 1 ? <Check size={13} /> : index + 1}</b><span>{label}</span></button>)}</div>
        <form onSubmit={submit} className="setup-form">
          <SetupCard number={1} active={draft.step === 1} complete={draft.step > 1} icon={<Landmark size={22} />} title="Organisation identity" detail="Tell us about the organisation that will own this workspace." status={draft.organization ? "Complete" : "In progress"} onClick={() => moveTo(1)}><div className="setup-grid three"><label>Organisation name<input value={draft.organization} onChange={(event) => update({ organization: event.target.value })} placeholder="Ridgeview Construction" /></label><label>Organisation type<select value={draft.organizationType} onChange={(event) => update({ organizationType: event.target.value })}><option value="contractor">Contractor</option><option value="consultant">Consultant</option><option value="public">Public agency</option></select></label><label>Country<select value={draft.country} onChange={(event) => update({ country: event.target.value })}><option value="GH">🇬🇭 Ghana</option></select></label></div></SetupCard>
          <SetupCard number={2} active={draft.step === 2} complete={draft.step > 2} icon={<UsersRound size={22} />} title="Invite colleagues" detail="Add the people who need access from day one." status={draft.invites.length ? "Ready" : undefined} onClick={() => moveTo(2)}><div className="invite-composer"><div className="chip-row">{team.map((person, index) => <span key={person}>{person}{index > 0 && <button type="button" aria-label={`Remove ${person}`} onClick={() => update({ invites: draft.invites.filter((invite) => invite !== person) })}><X size={13} /></button>}</span>)}</div><div className="invite-input"><input aria-label="Colleague email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addInvite(); } }} placeholder="name@organisation.org" /><button type="button" onClick={addInvite}>Add colleague</button></div></div></SetupCard>
          <SetupCard number={3} active={draft.step === 3} complete={draft.step > 3} icon={<ShieldCheck size={22} />} title="Set up roles" detail="Choose the responsibilities your first team needs." status={draft.roles.length ? "Ready" : undefined} onClick={() => moveTo(3)}><div className="role-chips">{["Project manager", "Site engineer", "Procurement"].map((role) => <button type="button" className={draft.roles.includes(role) ? "selected" : ""} onClick={() => update({ roles: toggle(draft.roles, role) })} key={role}>{draft.roles.includes(role) && <Check size={13} />}{role}</button>)}</div></SetupCard>
          <SetupCard number={4} active={draft.step === 4} complete={draft.step > 4} icon={<FileCog size={22} />} title="Policy settings" detail="Start with the evidence controls that fit this project." status={draft.policies.length ? "Ready" : undefined} onClick={() => moveTo(4)}><div className="role-chips">{["Evidence retention", "Material verification", "Approvals"].map((policy) => <button type="button" className={draft.policies.includes(policy) ? "selected" : ""} onClick={() => update({ policies: toggle(draft.policies, policy) })} key={policy}>{draft.policies.includes(policy) && <Check size={13} />}{policy}</button>)}</div></SetupCard>
          <SetupCard number={5} active={draft.step === 5} complete={draft.step > 5} icon={<FolderPlus size={22} />} title="Create your first project" detail="Start the evidence record you will manage in BuildProof." status={draft.projectName && draft.projectCode ? "Ready" : undefined} onClick={() => moveTo(5)}><div className="setup-grid"><label>Project name<input value={draft.projectName} onChange={(event) => update({ projectName: event.target.value })} placeholder="Northbank Civic Centre" /></label><label>Project code<input value={draft.projectCode} onChange={(event) => update({ projectCode: event.target.value })} placeholder="PRJ-1047" /></label></div></SetupCard>
          <SetupCard number={6} active={draft.step === 6} complete={false} icon={<Check size={22} />} title="Review and launch" detail="Confirm the setup and create your protected workspace." status={draft.step === 6 ? "Ready to launch" : undefined} onClick={() => moveTo(6)} />
          {message && <p className={`form-message ${status === "error" ? "is-error" : ""}`} role={status === "error" ? "alert" : "status"}>{message}</p>}{createdInviteLinks.length > 0 && <section className="onboarding-invite-links"><h2>Share team invitations</h2><p>Each link is email-bound and expires after seven days. BuildProof does not send email automatically.</p>{createdInviteLinks.map((invite) => <div key={invite.email}><strong>{invite.email}</strong><input aria-label={`Invitation link for ${invite.email}`} readOnly value={invite.url} /><button type="button" onClick={() => void navigator.clipboard.writeText(invite.url).then(() => setMessage(`Invitation link for ${invite.email} copied.`), () => setMessage("Select and copy the invitation link manually."))}>Copy link</button></div>)}</section>}<div className="setup-actions"><button type="button" className="secondary-action" disabled={draft.step === 1 || organizationReady} onClick={() => moveTo(draft.step - 1)}>Back</button><button className="primary-button" disabled={status === "saving"} type={organizationReady ? "button" : "submit"} onClick={organizationReady ? () => router.replace("/workspace") : undefined}>{status === "saving" ? "Creating your workspace…" : organizationReady ? <>Open workspace <ArrowRight size={18} /></> : draft.step === 6 ? <>Launch workspace <ArrowRight size={18} /></> : <>Continue <ArrowRight size={18} /></>}</button></div>
        </form>
      </section>
      <aside className="onboarding-summary"><article className="progress-summary"><h2>Setup progress</h2><div className="summary-progress"><div style={{ "--progress": progress } as React.CSSProperties}><b>{progress}%</b></div><ol>{setupSteps.map((label, index) => <li className={index + 1 < draft.step ? "done" : index + 1 === draft.step ? "current" : ""} key={label}><i>{index + 1 < draft.step ? <Check size={12} /> : index + 1}</i>{label}</li>)}</ol></div></article><article className="workspace-preview"><div className="panel-heading"><h2>Workspace preview</h2><button type="button" onClick={() => moveTo(5)}>View all →</button></div><Image src="/images/buildproof-project-preview.png" width={560} height={220} alt="Construction project preview" /><h3>{draft.organization || "Your organisation"} <span>{draft.organizationType}</span></h3><p>⌖ Accra, Greater Accra</p><div className="preview-metrics"><span><b>0</b>Projects</span><span><b>{team.length}</b>Team members</span><span><b>{draft.roles.length || "—"}</b>Roles</span><span><b>{draft.policies.length || "—"}</b>Policies</span></div></article><article className="tenant-note-card"><LockKeyhole size={23} /><p><strong>Your data, your organisation</strong><span>Information stays isolated to this tenant and is visible only to authorised team members.</span></p></article></aside>
    </div></section>
  </section></main>;
}

function SetupCard({ number, active, complete, icon, title, detail, status, onClick, children }: { number: number; active: boolean; complete: boolean; icon: ReactNode; title: string; detail: string; status?: string; onClick: () => void; children?: ReactNode }) {
  return <section className={`setup-card ${active ? "is-active" : ""} ${complete ? "is-complete" : ""}`}><button className="setup-card-hit" type="button" aria-label={`Open ${title}`} onClick={onClick} /><div className="setup-card-status">{complete ? <Check size={14} /> : number}</div><div className="card-icon">{icon}</div><div className="setup-card-copy"><h2>{title}</h2><p>{detail}</p></div><span className={`setup-state ${status ? "is-progress" : ""}`}>{status ?? "Not started"}</span><ChevronDown className="setup-chevron" size={17} />{children && <div className="setup-card-fields">{children}</div>}</section>;
}
