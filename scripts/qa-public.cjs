/* Read-only public-route checks against a local production server. */
const fs = require("node:fs");
const path = require("node:path");
const { chromium, expect } = require("@playwright/test");
const { default: AxeBuilder } = require("@axe-core/playwright");

const origin = process.env.QA_ORIGIN || "http://localhost:3001";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
  throw new Error("Public QA must target a local server.");

async function run() {
  const browser = await chromium.launch();
  const report = {
    origin,
    failures: [],
    inspections: [],
    hydration: false,
    protectedRoutes: [],
    fixtureAbsent: false,
    health: null,
  };
  const out = path.resolve("test-results/public");
  fs.mkdirSync(out, { recursive: true });
  try {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    page.on("pageerror", (error) => report.failures.push(error.message));
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /content security policy/i.test(message.text())
      )
        report.failures.push(message.text());
    });
    const response = await page.goto(`${origin}/auth`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-security-policy"]).toContain(
      "'strict-dynamic'",
    );
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    // This state change proves hydration, unlike a server-rendered screenshot.
    await page
      .getByRole("button", { name: "Create an organisation", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Create your account" }),
    ).toBeVisible();
    report.hydration = true;
    for (const width of [320, 1536]) {
      await page.setViewportSize({ width, height: 900 });
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      expect(result.violations).toEqual([]);
      expect(overflow).toBe(false);
      await page.screenshot({
        path: path.join(out, `auth-signup-${width}.png`),
        fullPage: true,
      });
      report.inspections.push({
        width,
        violations: result.violations.length,
        overflow,
      });
    }
    for (const route of ["workspace", "onboarding"]) {
      const result = await page.request.get(`${origin}/${route}`, {
        maxRedirects: 0,
      });
      expect([302, 303, 307, 308]).toContain(result.status());
      expect(result.headers().location).toContain("/auth");
      report.protectedRoutes.push({ route, status: result.status() });
    }
    const fixture = await page.request.get(`${origin}/qa-buildproof-local`);
    expect(fixture.status()).toBe(404);
    report.fixtureAbsent = true;
    const health = await page.request.get(`${origin}/api/health`);
    report.health = { status: health.status(), body: await health.json() };
    expect(health.status()).toBe(200);
    expect(report.health.body.status).toBe("ok");
    expect(report.failures).toEqual([]);
  } catch (error) {
    report.failures.push(error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(out, "report.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
  }
}
run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
