/* Anonymous, read-only browser checks for the public BuildProof demo. */
const fs = require("node:fs");
const path = require("node:path");
const { chromium, expect } = require("@playwright/test");
const { default: AxeBuilder } = require("@axe-core/playwright");

const origin = process.env.QA_ORIGIN || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
  throw new Error("Demo QA must target a local server.");

async function run() {
  const browser = await chromium.launch();
  const out = path.resolve("test-results/demo");
  fs.mkdirSync(out, { recursive: true });
  const report = {
    origin,
    anonymous: true,
    supabaseBrowserRequests: [],
    protectedWorkspaceStatus: null,
    inspections: [],
    journeys: [],
    failures: [],
  };
  try {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    page.on("request", (request) => {
      if (/supabase/i.test(request.url()))
        report.supabaseBrowserRequests.push(request.url());
    });
    page.on("pageerror", (error) => report.failures.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") report.failures.push(message.text());
    });

    for (const width of [320, 768, 1536]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(`${origin}/demo`, {
        waitUntil: "networkidle",
      });
      expect(response.status()).toBe(200);
      await expect(
        page.getByRole("heading", { name: "Performance at a glance" }),
      ).toBeVisible();
      await expect(page.getByText("438", { exact: true })).toBeVisible();
      const accessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(accessibility.violations).toEqual([]);
      expect(overflow).toBe(false);
      await page.screenshot({
        path: path.join(out, `workspace-${width}.png`),
        fullPage: true,
      });
      report.inspections.push({
        width,
        violations: accessibility.violations.length,
        overflow,
      });
    }

    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto(`${origin}/demo`);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    report.journeys.push("mobile navigation opens a module");

    await page.setViewportSize({ width: 1536, height: 900 });
    await page.goto(`${origin}/demo`);
    await page
      .getByRole("button", { name: /Search records, materials, teams/ })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Search demo workspace" }),
    ).toBeVisible();
    await page.getByPlaceholder("Search workspace modules…").fill("Materials");
    await page
      .getByRole("dialog", { name: "Search demo workspace" })
      .getByRole("button", { name: "Materials", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "Materials" })).toBeVisible();
    report.journeys.push("workspace search opens a module");

    const protectedWorkspace = await page.request.get(`${origin}/workspace`, {
      maxRedirects: 0,
    });
    report.protectedWorkspaceStatus = protectedWorkspace.status();
    expect([302, 303, 307, 308]).toContain(protectedWorkspace.status());
    expect(protectedWorkspace.headers().location).toContain("/auth");
    expect(report.supabaseBrowserRequests).toEqual([]);
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
