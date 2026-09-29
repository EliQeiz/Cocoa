"use client";

import { ArrowRight, Building2, Check, FileCog, FolderPlus, Landmark, MapPin, ShieldCheck, UsersRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("");
  const [organization, setOrganization] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const slug = useMemo(() => slugify(organization), [organization]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/auth");
      else setOwnerName(data.user.user_metadata.full_name || data.user.email?.split("@")[0] || "Project owner");
    });
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    const { data: organizationId, error: organizationError } = await supabase.rpc("create_organization", {
      p_legal_name: organization,
      p_display_name: organization,
      p_slug: slug,
      p_owner_display_name: ownerName,
    });
    if (organizationError || !organizationId) {
      setStatus("error");
      setMessage(organizationError?.message || "We could not create your organisation.");
      return;
    }
    const { error: projectError } = await supabase.rpc("create_first_project", {
      p_organization_id: organizationId,
      p_project_code: projectCode,
      p_name: projectName,
      p_client_name: null,
    });
    if (projectError) {
      setStatus("error");
      setMessage(projectError.message);
      return;
    }
    router.push("/workspace");
  }

  const steps = [
    [Building2, "Organisation", "Name, type and region"],
    [UsersRound, "People", "Invite your first colleagues"],
    [ShieldCheck, "Roles", "Define access boundaries"],
    [FileCog, "Policy", "Evidence and retention"],
    [FolderPlus, "First project", "Start building the record"],
  ];

  return (
    <main className="onboarding-page">
      <header className="onboarding-header"><div className="brand"><Building2 size={25} strokeWidth={1.8} /><span>BuildProof</span></div><span>Secure setup</span></header>
      <section className="onboarding-shell">
        <aside className="setup-rail">{steps.map(([Icon, label, detail], index) => <div className={`setup-step ${index === 0 ? "active" : ""}`} key={label as string}><span>{index === 0 ? <Check size={14} /> : index + 1}</span><div><strong>{label as string}</strong><small>{detail as string}</small></div></div>)}</aside>
        <section className="setup-content">
          <p className="step-caption">1 of 5 · Organisation</p>
          <h1>Set up your organisation</h1>
          <p className="lead">Create a secure space for your team and its first project.</p>
          <form onSubmit={submit} className="setup-form">
            <div className="form-card"><div className="card-icon"><Landmark size={20} /></div><div><h2>Organisation identity</h2><p>Your registered entity and project workspace.</p></div><div className="form-grid"><label>Organisation name<input required value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder="e.g. Ridgeview Construction" /></label><label>Workspace address<input value={slug} readOnly aria-label="Workspace address" /></label></div></div>
            <div className="form-card"><div className="card-icon"><UsersRound size={20} /></div><div><h2>Account owner</h2><p>You can invite colleagues after setup.</p></div><div className="form-grid"><label>Your name<input required value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="Full name" /></label><div className="role-chips"><span>Owner</span><span>Project manager</span><span>Procurement</span></div></div></div>
            <div className="form-card"><div className="card-icon"><MapPin size={20} /></div><div><h2>Create your first project</h2><p>Start a controlled evidence record now.</p></div><div className="form-grid"><label>Project name<input required value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="e.g. Northbank Civic Centre" /></label><label>Project code<input required value={projectCode} onChange={(event) => setProjectCode(event.target.value)} placeholder="e.g. PRJ-1047" /></label></div></div>
            {message && <p className="form-message is-error">{message}</p>}
            <button className="primary-button setup-submit" disabled={status === "saving"}>{status === "saving" ? "Creating your workspace…" : <>Create workspace <ArrowRight size={18} /></>}</button>
          </form>
        </section>
      </section>
    </main>
  );
}
