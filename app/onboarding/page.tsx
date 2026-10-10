"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Copy,
  FolderKanban,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  ShieldCheck,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { normalizeEmail, normalizePlainText } from "../../lib/security/input";
import { supabase } from "../../lib/supabase/client";
import { BuildProofBrand } from "../_components/buildproof-brand";

const onboardingSchema = z.object({
  organization: z
    .string()
    .trim()
    .min(2, "Enter your organisation name.")
    .max(160),
  organizationType: z.enum(["contractor", "consultant", "developer", "public"]),
  country: z.literal("GH"),
  projectName: z
    .string()
    .trim()
    .min(2, "Enter the first project name.")
    .max(180),
  projectCode: z.string().trim().min(2, "Enter a project code.").max(48),
  clientName: z.string().trim().max(160),
});
type OnboardingFields = z.infer<typeof onboardingSchema>;
type Invite = { email: string; role: string };
const steps = [
  {
    title: "Your organisation",
    description: "Tell us who you build with.",
    icon: Building2,
  },
  {
    title: "First project",
    description: "Give your site a shared workspace.",
    icon: FolderKanban,
  },
  {
    title: "Invite your team",
    description: "Choose who joins and what they can do.",
    icon: UsersRound,
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(1);
  const [ownerName, setOwnerName] = useState("Project owner");
  const [draftKey, setDraftKey] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("engineer");
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "ready">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [createdInviteLinks, setCreatedInviteLinks] = useState<
    Array<{ email: string; url: string }>
  >([]);
  const form = useForm<OnboardingFields>({
    resolver: zodResolver(onboardingSchema),
    mode: "onBlur",
    defaultValues: {
      organization: "",
      organizationType: "contractor",
      country: "GH",
      projectName: "",
      projectCode: "",
      clientName: "",
    },
  });
  const values = form.watch();
  const progress =
    status === "ready" ? 100 : Math.round(((step - 1) / 3) * 100);
  const organisationLabel = values.organization || "Your organisation";
  const projectLabel = values.projectName || "Your first project";
  const animation = {
    initial: false as const,
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduceMotion ? 0 : -8 },
    transition: { duration: reduceMotion ? 0 : 0.25 },
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.replace("/auth");
      const { data: memberships } = await supabase
        .from("organization_memberships")
        .select("id")
        .eq("user_id", data.user.id)
        .eq("status", "active")
        .limit(1);
      if (memberships?.length) return router.replace("/workspace");
      const key = `buildproof:onboarding:v2:${data.user.id}`;
      setDraftKey(key);
      setOwnerName(
        data.user.user_metadata.full_name ||
          data.user.email?.split("@")[0] ||
          "Project owner",
      );
      const saved = window.localStorage.getItem(key);
      if (!saved) return;
      try {
        const draft = JSON.parse(saved) as {
          values?: Partial<OnboardingFields>;
          invites?: Invite[];
          step?: number;
        };
        form.reset({ ...form.getValues(), ...draft.values, country: "GH" });
        setInvites(
          Array.isArray(draft.invites) ? draft.invites.slice(0, 25) : [],
        );
        setStep(Math.max(1, Math.min(3, Number(draft.step) || 1)));
      } catch {
        window.localStorage.removeItem(key);
      }
    });
  }, [form, router]);

  useEffect(() => {
    if (!draftKey) return;
    const subscription = form.watch((nextValues) => {
      try {
        window.localStorage.setItem(
          draftKey,
          JSON.stringify({ values: nextValues, invites, step }),
        );
      } catch {
        /* storage can be unavailable */
      }
    });
    try {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({ values: form.getValues(), invites, step }),
      );
    } catch {
      /* storage can be unavailable */
    }
    return () => subscription.unsubscribe();
  }, [draftKey, form, invites, step]);

  async function saveAndExit() {
    if (draftKey)
      try {
        window.localStorage.setItem(
          draftKey,
          JSON.stringify({ values: form.getValues(), invites, step }),
        );
      } catch {
        /* storage can be unavailable */
      }
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  function addInvite() {
    const email = normalizeEmail(inviteEmail);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setStatus("error");
      setMessage("Enter a valid colleague email address.");
      return;
    }
    if (!invites.some((invite) => invite.email === email))
      setInvites((current) => [...current, { email, role: inviteRole }]);
    setInviteEmail("");
    setStatus("idle");
    setMessage("");
  }

  async function nextStep() {
    setMessage("");
    setStatus("idle");
    const schema =
      step === 1
        ? onboardingSchema.pick({
            organization: true,
            organizationType: true,
            country: true,
          })
        : onboardingSchema.pick({
            projectName: true,
            projectCode: true,
            clientName: true,
          });
    const result = schema.safeParse(form.getValues());
    form.clearErrors();
    if (!result.success) {
      for (const issue of result.error.issues)
        form.setError(issue.path[0] as keyof OnboardingFields, {
          message: issue.message,
        });
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  }

  async function launch(valuesToSubmit: OnboardingFields) {
    if (step < 3) {
      await nextStep();
      return;
    }
    setStatus("saving");
    setMessage("");
    const organizationName = normalizePlainText(
      valuesToSubmit.organization,
      160,
    );
    const { data: organizationId, error: organizationError } =
      await supabase.rpc("create_organization", {
        p_legal_name: organizationName,
        p_display_name: organizationName,
        p_slug: slugify(organizationName),
        p_owner_display_name: normalizePlainText(ownerName, 120),
      });
    if (organizationError || !organizationId) {
      setStatus("error");
      setMessage(
        organizationError?.message || "We could not create your organisation.",
      );
      return;
    }
    const { error: projectError } = await supabase.rpc("create_first_project", {
      p_organization_id: organizationId,
      p_project_code: normalizePlainText(valuesToSubmit.projectCode, 48),
      p_name: normalizePlainText(valuesToSubmit.projectName, 180),
      p_client_name: normalizePlainText(valuesToSubmit.clientName, 160) || null,
    });
    if (projectError) {
      setStatus("error");
      setMessage(projectError.message);
      return;
    }
    const createdLinks: Array<{ email: string; url: string }> = [];
    for (const invite of invites) {
      const { data, error } = await supabase.rpc(
        "create_organization_invitation",
        {
          p_organization_id: organizationId,
          p_email: invite.email,
          p_role: invite.role,
        },
      );
      if (error || !data?.[0]?.invite_token) {
        setStatus("error");
        setMessage(
          `The workspace is ready, but ${invite.email} could not be invited: ${error?.message ?? "No invitation token was returned."}`,
        );
        setCreatedInviteLinks(createdLinks);
        return;
      }
      createdLinks.push({
        email: invite.email,
        url: `${window.location.origin}/auth?invite=${encodeURIComponent(data[0].invite_token)}`,
      });
    }
    if (draftKey) window.localStorage.removeItem(draftKey);
    if (createdLinks.length) {
      setCreatedInviteLinks(createdLinks);
      setStatus("ready");
      setMessage(
        "Your workspace is ready. Copy the invitation links, then open the project workspace.",
      );
      return;
    }
    router.replace("/workspace");
  }

  return (
    <main className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
        <BuildProofBrand compact className="onboarding-brand" />
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 text-sm font-medium text-slate-600 sm:flex">
            <LockKeyhole size={16} className="text-orange-600" />
            Secure tenant setup
          </span>
          <button
            type="button"
            onClick={() => void saveAndExit()}
            className="flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 sm:px-4 sm:text-sm"
          >
            <LogOut size={16} />
            Save and exit
          </button>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-[1320px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-12 xl:grid-cols-[220px_minmax(0,1fr)_290px]">
        <aside>
          <p className="flex items-center gap-2 text-sm font-medium text-sky-700">
            <Building2 size={17} />
            Workspace setup
          </p>
          <h1 className="mt-4 font-heading text-[28px] leading-tight font-semibold tracking-[-0.035em]">
            Make room for
            <br className="hidden lg:block" /> your next project.
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Set up your organisation, add a project and bring your team
            together.
          </p>
          <ol className="mt-6 grid grid-cols-3 gap-2 lg:mt-8 lg:grid-cols-1">
            {steps.map((item, index) => {
              const number = index + 1;
              const Icon = item.icon;
              const active = step === number;
              const complete = step > number;
              return (
                <li key={item.title}>
                  <button
                    type="button"
                    onClick={() => number <= step && setStep(number)}
                    aria-current={active ? "step" : undefined}
                    disabled={number > step}
                    className={`flex w-full flex-col items-start gap-2 rounded-lg border p-3 text-left transition lg:flex-row lg:gap-3 ${active ? "border-orange-200 bg-orange-50" : "border-transparent hover:bg-white"}`}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${complete ? "bg-emerald-100 text-emerald-700" : active ? "bg-orange-500 text-white" : "bg-white text-slate-500"}`}
                    >
                      {complete ? <Check size={17} /> : <Icon size={17} />}
                    </span>
                    <span>
                      <strong className="block text-sm font-bold">
                        {number}. {item.title}
                      </strong>
                      <small className="mt-1 hidden text-xs leading-5 text-slate-600 lg:block">
                        {item.description}
                      </small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <section className="min-w-0 self-start rounded-xl border border-slate-200 bg-white p-6 shadow-[0_2px_3px_rgba(15,23,42,.03)] sm:p-9">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-slate-500">
              Step {step} of 3
            </span>
            <span className="font-mono text-sm font-semibold tabular-nums text-slate-700">
              {progress}%
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-orange-500"
              initial={false}
              style={{ width: `${progress}%` }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: reduceMotion ? 0 : 0.25 }}
            />
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (step < 3) void nextStep();
              else void form.handleSubmit(launch)(event);
            }}
            className="onboarding-form mt-8"
          >
            <AnimatePresence mode="wait" initial={false}>
              {step === 1 && (
                <motion.div key="organisation" {...animation}>
                  <StepHeading
                    title="Tell us about your organisation"
                    description="Your projects and team will belong to this organisation."
                  />
                  <div className="mt-7 grid gap-5">
                    <Field
                      label="Organisation name"
                      error={form.formState.errors.organization?.message}
                    >
                      <input
                        autoFocus
                        placeholder="e.g. Ridgeview Construction"
                        {...form.register("organization")}
                      />
                    </Field>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field
                        label="Organisation type"
                        error={form.formState.errors.organizationType?.message}
                      >
                        <select {...form.register("organizationType")}>
                          <option value="contractor">Contractor</option>
                          <option value="consultant">Consultant</option>
                          <option value="developer">Developer</option>
                          <option value="public">Public agency</option>
                        </select>
                      </Field>
                      <Field label="Country">
                        <select {...form.register("country")}>
                          <option value="GH">Ghana</option>
                        </select>
                      </Field>
                    </div>
                  </div>
                  <div className="mt-7 flex gap-3 rounded-lg border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-slate-600">
                    <ShieldCheck
                      size={20}
                      className="mt-0.5 shrink-0 text-sky-600"
                    />
                    <p>
                      Only people you invite can access your organisation’s
                      project records.
                    </p>
                  </div>
                </motion.div>
              )}
              {step === 2 && (
                <motion.div key="project" {...animation}>
                  <StepHeading
                    title="First project"
                    description="Give your team a shared place to track deliveries, evidence and approvals."
                  />
                  <div className="mt-7 grid gap-5">
                    <Field
                      label="Project name"
                      error={form.formState.errors.projectName?.message}
                    >
                      <input
                        autoFocus
                        placeholder="Northbank Civic Centre"
                        {...form.register("projectName")}
                      />
                    </Field>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field
                        label="Project code"
                        error={form.formState.errors.projectCode?.message}
                      >
                        <input
                          className="font-mono"
                          placeholder="PRJ-1047"
                          {...form.register("projectCode")}
                        />
                      </Field>
                      <Field label="Client or owner">
                        <input
                          placeholder="Public Infrastructure Authority"
                          {...form.register("clientName")}
                        />
                      </Field>
                    </div>
                  </div>
                </motion.div>
              )}
              {step === 3 && (
                <motion.div key="invite" {...animation}>
                  <StepHeading
                    title="Invite your delivery team"
                    description="Add only the people who need access now. You can manage roles later."
                  />
                  <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px_auto]">
                      <div className="relative">
                        <Mail
                          size={17}
                          className="absolute left-3 top-3.5 text-slate-400"
                        />
                        <input
                          autoFocus
                          type="email"
                          aria-label="Colleague email"
                          value={inviteEmail}
                          onChange={(event) =>
                            setInviteEmail(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addInvite();
                            }
                          }}
                          placeholder="name@organisation.org"
                          className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                        />
                      </div>
                      <select
                        aria-label="Colleague role"
                        value={inviteRole}
                        onChange={(event) => setInviteRole(event.target.value)}
                        className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                      >
                        <option value="engineer">Engineer</option>
                        <option value="site_receiver">Site receiver</option>
                        <option value="quantity_surveyor">
                          Quantity surveyor
                        </option>
                        <option value="contractor_manager">
                          Contractor manager
                        </option>
                      </select>
                      <button
                        type="button"
                        onClick={addInvite}
                        className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold hover:bg-slate-50"
                      >
                        <UserPlus size={17} className="mr-2 inline" />
                        Add
                      </button>
                    </div>
                  </div>
                  <div className="mt-5 space-y-2">
                    {invites.length ? (
                      invites.map((invite) => (
                        <div
                          key={invite.email}
                          className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3"
                        >
                          <div>
                            <strong className="block text-sm">
                              {invite.email}
                            </strong>
                            <span className="text-xs font-medium text-slate-500">
                              {invite.role.replaceAll("_", " ")}
                            </span>
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove ${invite.email}`}
                            onClick={() =>
                              setInvites((current) =>
                                current.filter(
                                  (item) => item.email !== invite.email,
                                ),
                              )
                            }
                            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <X size={17} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center">
                        <UsersRound className="mx-auto text-slate-400" />
                        <p className="mt-3 text-sm font-semibold">
                          No colleagues added yet
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          You can launch with just the organisation owner.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {message && (
              <p
                role={status === "error" ? "alert" : "status"}
                className={`mt-5 rounded-xl border px-4 py-3 text-sm font-medium leading-6 ${status === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
              >
                {message}
              </p>
            )}
            {createdInviteLinks.length > 0 && (
              <div className="mt-4 space-y-2">
                {createdInviteLinks.map((invite) => (
                  <div
                    key={invite.email}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <strong className="text-sm">{invite.email}</strong>
                    <div className="mt-2 flex gap-2">
                      <input
                        readOnly
                        value={invite.url}
                        aria-label={`Invitation link for ${invite.email}`}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          void navigator.clipboard.writeText(invite.url)
                        }
                        className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
              <button
                type="button"
                disabled={step === 1 || status === "saving"}
                onClick={() => setStep((current) => Math.max(1, current - 1))}
                className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 disabled:opacity-40"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              {status === "ready" ? (
                <button
                  key="open-workspace"
                  type="button"
                  onClick={() => router.replace("/workspace")}
                  className="flex h-11 items-center gap-2 rounded-lg bg-orange-700 px-5 text-sm font-semibold text-white hover:bg-orange-800"
                >
                  Open workspace <ArrowRight size={16} />
                </button>
              ) : step < 3 ? (
                <button
                  key={`continue-${step}`}
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    void nextStep();
                  }}
                  className="flex h-11 items-center gap-2 rounded-lg bg-orange-700 px-5 text-sm font-semibold text-white hover:bg-orange-800"
                >
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  key="launch-workspace"
                  type="submit"
                  disabled={status === "saving"}
                  className="flex h-11 items-center gap-2 rounded-lg bg-orange-700 px-3 text-sm font-semibold text-white hover:bg-orange-800 disabled:opacity-70 sm:px-5"
                >
                  {status === "saving" ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Creating workspace…
                    </>
                  ) : (
                    <>
                      Launch workspace <ArrowRight size={16} />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </section>

        <aside className="hidden space-y-5 xl:sticky xl:top-8 xl:block xl:self-start">
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_12px_32px_rgba(15,23,42,.06)]">
            <div className="relative aspect-[16/8.5]">
              <Image
                src="/images/buildproof-project-preview.png"
                alt="Workspace project preview"
                fill
                className="object-cover"
                sizes="320px"
              />
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-bold">
                    {organisationLabel}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin size={14} />
                    Ghana
                  </p>
                </div>
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
                  {values.organizationType}
                </span>
              </div>
              <div className="mt-5 rounded-xl bg-sky-50 p-4">
                <span className="text-xs font-bold uppercase tracking-[0.07em] text-sky-700">
                  First project
                </span>
                <strong className="mt-1 block text-sm">{projectLabel}</strong>
                <span className="mt-1 block font-mono text-xs text-slate-500">
                  {values.projectCode || "Project code pending"}
                </span>
              </div>
            </div>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <ShieldCheck size={20} />
              </span>
              <div>
                <h2 className="text-sm font-bold">
                  Your data, your organisation
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Your team’s access is managed by role. People outside your
                  organisation cannot see its records.
                </p>
              </div>
            </div>
          </article>
        </aside>
      </div>
    </main>
  );
}

function StepHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header>
      <h2 className="font-heading text-[24px] leading-snug font-semibold tracking-[-0.03em]">
        {title}
      </h2>
      <p className="mt-3 text-[15px] leading-7 text-slate-600">{description}</p>
    </header>
  );
}
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <span className="[&_input]:h-12 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-slate-300 [&_input]:px-4 [&_input]:text-sm [&_input]:font-normal [&_input]:outline-none [&_input]:focus:border-orange-500 [&_input]:focus:ring-4 [&_input]:focus:ring-orange-100 [&_select]:h-12 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-300 [&_select]:bg-white [&_select]:px-4 [&_select]:text-sm [&_select]:font-normal [&_select]:outline-none [&_select]:focus:border-orange-500 [&_select]:focus:ring-4 [&_select]:focus:ring-orange-100">
        {children}
      </span>
      <small
        role={error ? "alert" : undefined}
        className="min-h-5 text-sm font-medium text-rose-700"
      >
        {error ?? ""}
      </small>
    </label>
  );
}
