/* Production PWA shell check. It intentionally avoids authenticated data and never writes to Supabase. */
const { chromium, expect } = require("@playwright/test");

const origin = process.env.QA_ORIGIN || "http://localhost:3100";

async function run() {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const manifest = await page.request.get(`${origin}/manifest.webmanifest`);
    expect(manifest.status()).toBe(200);
    await page.goto(`${origin}/demo`, { waitUntil: "networkidle" });
    await expect(page.getByText("You’re exploring a read-only demo")).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    await page.goto(`${origin}/demo`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("You’re exploring a read-only demo")).toBeVisible();
    console.log(JSON.stringify({ origin, cachedDemoShell: true, manifest: true }, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
