import { chromium } from "playwright";

async function testPWA() {
  console.log("Starting Playwright investigation...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.log(`[Browser Error]: ${error.message}`));
  page.on('response', response => {
    if (response.status() >= 400 && response.url().includes('localhost')) {
      console.log(`[Network Error] ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log("==== Testing /clear-cache ====");
    const response = await page.goto("http://localhost:3001/clear-cache", { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log(`Page Load Status: ${response?.status()}`);
    console.log(`Final URL: ${page.url()}`);
    
    const content = await page.content();
    if (content.includes("Hard Reset")) {
      console.log("✅ Rendered /admin/clear-cache successfully.");
    } else {
      console.log("❌ Did NOT render /admin/clear-cache. Page content does not match.");
    }
    
    console.log("\n==== Testing manifest.json ====");
    const manifestResponse = await page.goto("http://localhost:3001/manifest.json");
    console.log(`Manifest Status: ${manifestResponse?.status()}`);
    
    console.log("\n==== Testing sw.js ====");
    const swResponse = await page.goto("http://localhost:3001/sw.js");
    console.log(`Service Worker Status: ${swResponse?.status()}`);

  } catch (err: any) {
    console.error("Test failed:", err.message);
  } finally {
    await browser.close();
  }
}

testPWA();
