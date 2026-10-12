/* Local visual harness imports the actual product pages. All browser Supabase
   traffic is intercepted; it never creates users or modifies live records. */
const fs = require("node:fs");
const path = require("node:path");
const { chromium, expect } = require("@playwright/test");
const { default: AxeBuilder } = require("@axe-core/playwright");

const origin = process.env.QA_ORIGIN || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
  throw new Error("QA must target a local development server.");
const env = fs.readFileSync(".env.local", "utf8");
const supabaseUrl = env.match(
  /^NEXT_PUBLIC_SUPABASE_URL=['"]?([^\r\n'"]+)/m,
)?.[1];
if (!supabaseUrl) throw new Error("Missing public Supabase URL.");
const host = new URL(supabaseUrl).hostname.split(".")[0];
const fixtureDir = path.resolve("app/qa-buildproof-local");
if (fs.existsSync(fixtureDir))
  throw new Error("QA route already exists; refusing to overwrite.");
const out = path.resolve("test-results/ui");
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "designer@example.test",
  user_metadata: { full_name: "Jordan Lee" },
  app_metadata: { provider: "email" },
  aud: "authenticated",
  role: "authenticated",
  created_at: "2025-01-01T00:00:00Z",
};
const project = {
  id: "22222222-2222-4222-8222-222222222222",
  organization_id: "33333333-3333-4333-8333-333333333333",
  name: "Northbank Civic Centre",
  project_code: "PRJ-1047",
  status: "active",
  client_name: "Public infrastructure",
  planned_start_date: "2024-01-01",
  planned_end_date: "2026-12-31",
};
const packages = [
  "Cement (C35)",
  "Rebar (B500B)",
  "Aggregates (Graded)",
  "Bitumen (60/70)",
  "Precast elements",
].map((name, i) => ({
  id: `material-${i}`,
  package_code: `MAT-00${i + 1}`,
  name,
  status: i === 2 ? "pending_review" : i === 4 ? "rejected" : "acceptable",
  approved_quantity: [50, 30, 20, 10, 5][i],
  received_quantity: [42, 28, 16, 8, 2][i],
  verified_quantity: [42, 28, 0, 8, 0][i],
  unit: "tonnes",
}));
const records = {
  organizations: [
    {
      id: project.organization_id,
      display_name: "Ridgeview Construction",
      settings: { reported_progress: 62, reported_evidence_rate: 78 },
    },
  ],
  projects: [project],
  project_sites: [{ locality: "Accra, Greater Accra" }],
  verifications: Array.from({ length: 14 }, (_, i) => ({
    id: `evidence-${i}`,
    status: i < 10 ? "accepted" : i < 13 ? "submitted" : "rejected",
    unit: "tonnes",
    findings: `Concrete inspection ${i + 1}`,
    created_at: "2025-04-12T10:00:00Z",
  })),
  material_packages: packages,
  approval_actions: [
    {
      id: "decision-1",
      decision: "approved",
      rationale: "Inspection complete",
    },
    { id: "decision-2", decision: "queried", rationale: "Missing test result" },
  ],
  exceptions: [
    {
      id: "risk-1",
      status: "open",
      title: "Rebar supply delay",
      severity: "high",
      description: "Confirm alternative delivery date",
    },
  ],
  release_recommendations: [{ id: "release-1", status: "ready_for_review" }],
  deliveries: Array.from({ length: 30 }, (_, index) => ({
    id: `delivery-${30 - index}`,
    delivery_reference: `DEL-${String(30 - index).padStart(3, "0")}`,
    status: "received",
    vehicle_reference: "GA-124-22",
    received_at: "2025-04-12T10:00:00Z",
    notes: "Cement delivery received",
    created_at: "2025-04-12T10:00:00Z",
  })),
  audit_events: [
    "Cement delivery recorded",
    "Inspection completed",
    "Evidence uploaded",
    "Approval requested",
    "Material record updated",
  ].map((title, i) => ({
    id: `audit-${i}`,
    event_type: title.toLowerCase().replaceAll(" ", "_"),
    entity_type: "delivery",
    occurred_at: `2025-04-${String(12 - i).padStart(2, "0")}T10:00:00Z`,
  })),
};
const failures = [];
const inspections = [];
async function mock(context, onboarding = false, rpcCalls = []) {
  await context.route(`${supabaseUrl}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("/rest/v1/rpc/")) rpcCalls.push(url.pathname);
    let result = [];
    if (url.pathname.endsWith("/auth/v1/user")) result = user;
    else if (url.pathname.endsWith("/auth/v1/otp")) result = {};
    else if (url.pathname.endsWith("/auth/v1/verify"))
      return route.fulfill({
        status: 403,
        json: { error_code: "otp_expired", msg: "Code has expired" },
      });
    else if (url.pathname.includes("/rest/v1/")) {
      const name = url.pathname.split("/").pop();
      result =
        name === "organization_memberships"
          ? onboarding
            ? []
            : [
                {
                  id: "membership-1",
                  role: "organization_owner",
                  status: "active",
                },
              ]
          : records[name] || [];
      if (
        route.request().headers()["accept"]?.includes("vnd.pgrst.object+json")
      )
        result = result[0] || null;
    }
    return route.fulfill({ status: 200, json: result });
  });
  await context.addInitScript(
    ({ host, user }) => {
      const encode = (value) =>
        btoa(JSON.stringify(value))
          .replaceAll("+", "-")
          .replaceAll("/", "_")
          .replaceAll("=", "");
      const expires = Math.floor(Date.now() / 1000) + 3600;
      const session = {
        access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: expires, role: "authenticated" })}.fixture-signature`,
        refresh_token: "fixture-refresh",
        expires_at: expires,
        expires_in: 3600,
        token_type: "bearer",
        user,
      };
      document.cookie = `sb-${host}-auth-token=base64-${encode(session)}; path=/; SameSite=Lax`;
    },
    { host, user },
  );
}
async function inspect(page, name, width, height = 900) {
  await page.setViewportSize({ width, height });
  await page.evaluate(() => document.fonts.ready);
  await page.locator("nextjs-portal").evaluateAll((elements) =>
    elements.forEach((element) => {
      element.style.display = "none";
    }),
  );
  const hiddenText = await page
    .locator("main h1, main h2")
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          if (!element.getBoundingClientRect().width) return false;
          for (let parent = element; parent; parent = parent.parentElement)
            if (getComputedStyle(parent).opacity === "0") return true;
          return false;
        })
        .map((element) => element.textContent),
    );
  if (hiddenText.length)
    failures.push(
      `${name} invisible headings at ${width}px: ${hiddenText.join(", ")}`,
    );
  await page.screenshot({
    path: path.join(out, `${name}-${width}.png`),
    fullPage: true,
  });
  const overflowing = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  if (overflowing) failures.push(`${name} horizontal overflow at ${width}px`);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  inspections.push({
    name,
    width,
    height,
    violations: result.violations.length,
  });
  for (const issue of result.violations)
    failures.push(
      `${name} ${width}px: ${issue.id} (${issue.nodes.map((node) => node.target.join(" ")).join("; ")})`,
    );
}
async function run() {
  fs.mkdirSync(fixtureDir);
  fs.mkdirSync(out, { recursive: true });
  // Never available in production; finally removes it even after an assertion fails.
  fs.writeFileSync(
    path.join(fixtureDir, "page.tsx"),
    `import { notFound } from 'next/navigation';\nimport Workspace from '../workspace/page';\nimport Onboarding from '../onboarding/page';\nexport default async function QA({searchParams}:{searchParams:Promise<{page?:string}>}){if(process.env.NODE_ENV!=='development')notFound();return (await searchParams).page==='onboarding'?<Onboarding/>:<Workspace/>;}`,
  );
  let browser;
  try {
    browser = await chromium.launch();
    const authContext = await browser.newContext({ reducedMotion: "reduce" });
    await authContext.route(`${supabaseUrl}/**`, (route) =>
      route.request().url().includes("/auth/v1/verify")
        ? route.fulfill({
            status: 403,
            json: { error_code: "otp_expired", msg: "Code has expired" },
          })
        : route.fulfill({ status: 200, json: {} }),
    );
    const auth = await authContext.newPage();
    auth.on("pageerror", (error) => failures.push(`Auth JS: ${error.message}`));
    await auth.goto(`${origin}/auth`);
    await expect(
      auth.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    for (const width of [320, 360, 768, 1280, 1536])
      await inspect(auth, "auth", width);
    await auth.emulateMedia({ reducedMotion: "no-preference" });
    await inspect(auth, "auth-motion", 1536);
    await auth
      .getByRole("button", { name: "Create an organisation", exact: true })
      .click();
    await expect(
      auth.getByRole("heading", { name: "Create your account" }),
    ).toBeVisible();
    await auth.getByLabel("Work email").fill("designer@example.test");
    await auth.getByRole("button", { name: "Continue with email" }).click();
    await expect(
      auth.getByRole("heading", { name: "Check your email" }),
    ).toBeVisible();
    await auth.getByLabel("Digit 1", { exact: true }).fill("1");
    await expect(auth.getByLabel("Digit 2", { exact: true })).toBeFocused();
    await inspect(auth, "auth-code", 360);
    for (let digit = 2; digit <= 6; digit++)
      await auth
        .getByLabel(`Digit ${digit}`, { exact: true })
        .fill(String(digit));
    await auth.getByRole("button", { name: "Verify and continue" }).click();
    await expect(auth.locator('p[role="alert"]')).toBeVisible();
    await inspect(auth, "auth-code-error", 360);
    await authContext.close();
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await mock(context);
    const page = await context.newPage();
    page.on("pageerror", (error) =>
      failures.push(`Workspace JS: ${error.message}`),
    );
    await page.goto(`${origin}/qa-buildproof-local`);
    await expect(
      page.getByRole("button", { name: /Northbank Civic Centre Active/ }),
    ).toBeVisible();
    await expect(
      page.locator(".stat-card").first().locator("strong"),
    ).toHaveText("10");
    for (const width of [320, 360, 768, 1280, 1536])
      await inspect(page, "workspace", width);
    await page.setViewportSize({ width: 1536, height: 900 });
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(page.locator(".workspace-page")).toHaveAttribute(
      "data-theme",
      "dark",
    );
    await inspect(page, "workspace-dark", 1536);
    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(page.locator(".workspace-page")).toHaveAttribute(
      "data-theme",
      "light",
    );
    await page
      .getByRole("button", { name: /Northbank Civic Centre Active/ })
      .click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: /Northbank Civic Centre Active/ }),
    ).toBeFocused();
    const sidebarTop = await page
      .locator(".workspace-sidebar")
      .evaluate((element) => element.getBoundingClientRect().top);
    await page
      .locator(".workspace-main")
      .evaluate((element) => (element.scrollTop = 400));
    expect(
      await page
        .locator(".workspace-sidebar")
        .evaluate((element) => element.getBoundingClientRect().top),
    ).toBe(sidebarTop);
    await page.getByRole("button", { name: "View site details" }).click();
    await expect(
      page.getByRole("dialog", { name: "Northbank Civic Centre" }),
    ).toBeVisible();
    await inspect(page, "site-details", 1536);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Collapse navigation" }).click();
    await expect(page.locator(".workspace-page")).toHaveClass(/is-collapsed/);
    await inspect(page, "workspace-collapsed", 1536);
    await page.getByRole("button", { name: "Expand navigation" }).click();
    await page.keyboard.press("Control+k");
    await expect(
      page.getByRole("dialog", { name: "Search workspace" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.keyboard.press("Control+k");
    await expect(
      page.getByRole("dialog", { name: "Search workspace" }),
    ).toBeVisible();
    await page.getByLabel("Find projects or modules").fill("materials");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Materials", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Materials", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".suite-table tbody tr")).toHaveCount(5);
    await page.locator(".suite-table tbody tr").first().focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Materials" })).toBeVisible();
    await page.getByRole("button", { name: "Close record details" }).click();
    await inspect(page, "materials", 1536);
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Deliveries", exact: true })
      .click();
    await expect(page.locator(".suite-table tbody tr")).toHaveCount(25);
    await page
      .locator(".suite-table tbody tr")
      .first()
      .getByText("DEL-030", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Delivery Reference", exact: true })
      .click();
    await expect(page.locator(".suite-table tbody tr").first()).toContainText(
      "DEL-001",
    );
    await page
      .getByRole("navigation", { name: "Deliveries pages" })
      .getByRole("button", { name: "Next" })
      .click();
    await expect(page.locator(".suite-table tbody tr")).toHaveCount(5);
    await expect(page.locator(".suite-table tbody tr").first()).toContainText(
      "DEL-026",
    );
    await page
      .getByRole("navigation", { name: "Workspace navigation", exact: true })
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    await page.getByRole("tab", { name: "Security", exact: true }).click();
    await inspect(page, "settings", 1536);
    for (const [name, heading] of [
      ["Projects", "Projects"],
      ["RFIs", "Requests for information"],
      ["Submittals", "Submittals"],
      ["Daily logs", "Daily logs"],
      ["Approvals", "Approvals"],
      ["Issues", "Issues"],
      ["Change orders", "Change orders"],
      ["Reports", "Reports"],
      ["Team", "Team"],
      ["Inspections", "Inspections"],
      ["Risks", "Risks"],
      ["Finance", "Finance"],
    ]) {
      await page.setViewportSize({ width: 1536, height: 900 });
      await page.keyboard.press("Control+k");
      await page.getByLabel("Find projects or modules").fill(name);
      await page
        .getByRole("dialog", { name: "Search workspace" })
        .getByRole("button", { name, exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: heading, exact: true }),
      ).toBeVisible();
      await expect(page.locator(".data-table-skeleton")).toHaveCount(0);
      const createButton = page.locator(".suite-create-button");
      if (await createButton.count()) await createButton.click();
      await inspect(
        page,
        `suite-${name.toLowerCase().replaceAll(" ", "-")}`,
        1536,
      );
      await inspect(
        page,
        `suite-${name.toLowerCase().replaceAll(" ", "-")}`,
        320,
      );
    }
    await page.setViewportSize({ width: 360, height: 800 });
    expect(
      await page.locator(".workspace-header").evaluate((element) =>
        Math.round(element.getBoundingClientRect().top),
      ),
    ).toBe(0);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("dialog", { name: "Workspace menu" }),
    ).toBeVisible();
    await page
      .getByRole("dialog", { name: "Workspace menu" })
      .getByRole("button", { name: "Switch to dark mode" })
      .click();
    await expect(page.locator(".workspace-page")).toHaveAttribute(
      "data-theme",
      "dark",
    );
    await page
      .getByRole("dialog", { name: "Workspace menu" })
      .getByRole("button", { name: "Switch to light mode" })
      .click();
    await expect(page.locator(".workspace-page")).toHaveAttribute(
      "data-theme",
      "light",
    );
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("navigation", { name: "Workspace navigation", exact: true })
      .getByRole("button", { name: "Evidence", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Delivery evidence" }),
    ).toBeVisible();
    await inspect(page, "evidence", 360);
    await context.close();
    const onboardContext = await browser.newContext({
      reducedMotion: "reduce",
    });
    const onboardingRpcs = [];
    await mock(onboardContext, true, onboardingRpcs);
    const onboard = await onboardContext.newPage();
    onboard.on("pageerror", (error) =>
      failures.push(`Onboarding JS: ${error.message}`),
    );
    await onboard.goto(`${origin}/qa-buildproof-local?page=onboarding`);
    await expect(
      onboard.getByRole("heading", { name: "Tell us about your organisation" }),
    ).toBeVisible();
    for (const width of [320, 360, 768, 1280, 1536])
      await inspect(onboard, "onboarding", width);
    await onboard
      .getByRole("button", { name: "Continue", exact: true })
      .click();
    await expect(onboard.locator('small[role="alert"]')).toContainText(
      "Enter your organisation name",
    );
    await onboard
      .getByLabel("Organisation name")
      .fill("Ridgeview Construction");
    await onboard
      .getByRole("button", { name: "Continue", exact: true })
      .click();
    await expect(
      onboard.getByRole("heading", { name: "First project", exact: true }),
    ).toBeVisible();
    await onboard.getByLabel("Project name").fill("Northbank Civic Centre");
    await onboard.getByLabel("Project code").fill("PRJ-1047");
    await onboard
      .getByRole("button", { name: "Continue", exact: true })
      .click();
    await expect(
      onboard.getByRole("heading", { name: "Invite your delivery team" }),
    ).toBeVisible();
    await expect(
      onboard.getByRole("button", { name: "Launch workspace" }),
    ).toBeEnabled();
    expect(onboardingRpcs).toHaveLength(0);
    await inspect(onboard, "onboarding-team", 360);
    await onboard.getByLabel("Colleague email").fill("sarah@example.test");
    await onboard.getByRole("button", { name: "Add", exact: true }).click();
    await expect(
      onboard.getByRole("button", { name: "Remove sarah@example.test" }),
    ).toBeVisible();
    await onboard
      .getByRole("button", { name: "Remove sarah@example.test" })
      .click();
    await expect(onboard.getByText("No colleagues added yet")).toBeVisible();
    expect(onboardingRpcs).toHaveLength(0);
    console.log(
      JSON.stringify(
        {
          screenshots: out,
          inspections: inspections.length,
          failures,
          scope: "Isolated page fixtures; no live data written.",
        },
        null,
        2,
      ),
    );
    if (failures.length) process.exitCode = 1;
  } catch (error) {
    failures.push(`Journey assertion: ${error.message}`);
    throw error;
  } finally {
    fs.writeFileSync(
      path.join(out, "report.json"),
      JSON.stringify(
        {
          failures,
          inspections,
          scope: "Isolated UI fixtures. No live records changed.",
        },
        null,
        2,
      ),
    );
    if (browser) await browser.close();
    fs.unlinkSync(path.join(fixtureDir, "page.tsx"));
    fs.rmdirSync(fixtureDir);
  }
}
run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
