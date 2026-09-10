const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const { loadEnvConfig } = require('@next/env');
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const adminToken = process.env.ADMIN_TOKEN;

if (!adminToken) {
  console.error('CRITICAL: ADMIN_TOKEN is missing or could not be loaded from .env.local');
  process.exit(1);
}

(async () => {
  console.log('Starting Next.js dev server...');
  const isWin = /^win/.test(process.platform);
  const server = spawn(isWin ? 'npm.cmd' : 'npm', ['run', 'dev'], {
    cwd: process.cwd(),
    env: process.env,
    shell: true,
    detached: !isWin // allows killing process group on Unix
  });

  const baseUrl = 'http://localhost:3000';
  let serverReady = false;

  server.stdout.on('data', (data) => {
    const text = data.toString();
    console.log('[Next.js]:', text.trim());
    if (text.includes('Ready in') || text.includes('Local:') || text.includes('ready in') || text.includes('Starting...')) {
      if (!serverReady) {
          serverReady = true;
          runTests(server);
      }
    }
  });

  server.stderr.on('data', (data) => {
    console.error('[Next.js Error]:', data.toString().trim());
  });

  server.on('close', (code) => {
    if (!serverReady) {
      console.error(`[Fatal] Development server exited prematurely with code ${code}.`);
      process.exit(1);
    }
  });

  server.on('error', (err) => {
    console.error('[Fatal] Server failed to start:', err);
    if (!serverReady) {
      process.exit(1);
    }
  });

  async function runTests(serverProcess) {
    // Wait briefly for the server to actually start accepting connections after the Ready message
    await new Promise(r => setTimeout(r, 5000));
    
    // Check if localhost:3000 is actually up via fetch
    try {
        await fetch(`${baseUrl}/admin/login`);
    } catch(e) {
        console.log('Server not fully ready, waiting 5 more seconds...', e.message);
        await new Promise(r => setTimeout(r, 5000));
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    let testFailed = false;

    try {
      console.log('Navigating to admin login...');
      await page.goto(`${baseUrl}/admin/login`, { waitUntil: 'load' });
      
      console.log('Logging in...');
      await page.fill('input[type="password"]', adminToken);
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/admin');
      console.log('Login successful.');

      console.log('Testing products listing...');
      await page.goto(`${baseUrl}/admin/products`);
      await page.waitForSelector('h1', { state: 'visible' });
      const productHeading = await page.textContent('h1');
      if (!productHeading.includes('Products')) throw new Error('Products page failed to load.');

      console.log('Testing add product page...');
      await page.goto(`${baseUrl}/admin/products/new`);
      await page.waitForSelector('h1', { state: 'visible' });

      console.log('Checking for HEIC and HEIF support in file input...');
      const fileInputs = await page.$$('input[type="file"]');
      let heicFound = false;
      let heifFound = false;

      for (const input of fileInputs) {
        const acceptAttr = await input.getAttribute('accept');
        if (acceptAttr) {
          if (acceptAttr.toLowerCase().includes('.heic')) {
            console.log('HEIC format is supported in file input.');
            heicFound = true;
          }
          if (acceptAttr.toLowerCase().includes('.heif')) {
            console.log('HEIF format is supported in file input.');
            heifFound = true;
          }
        }
      }
      if (!heicFound) {
        throw new Error('HEIC format (.heic) is missing from the file inputs.');
      }
      if (!heifFound) {
        throw new Error('HEIF format (.heif) is missing from the file inputs.');
      }
      
      console.log('Checking for Video links...');
      await page.waitForSelector('label:has-text("TikTok Video Link")');
      await page.waitForSelector('label:has-text("Instagram Reel Link")');
      console.log('Video links found.');

      console.log('Testing email sending (bulk messages) page...');
      await page.goto(`${baseUrl}/admin/email-sending`);
      await page.waitForSelector('h1', { state: 'visible' });
      const emailHeading = await page.textContent('h1');
      if (!emailHeading.includes('Email sending')) throw new Error('Email sending page failed to load.');

      console.log('All admin features tested successfully. No issues found.');
    } catch (error) {
      console.error('Test failed:', error);
      testFailed = true;
      process.exitCode = 1;
    } finally {
      console.log('Cleaning up resources...');
      await browser.close();
      
      console.log('Terminating development server process tree...');
      if (/^win/.test(process.platform)) {
        const { execSync } = require('child_process');
        try {
            execSync(`taskkill /pid ${serverProcess.pid} /t /f`, { stdio: 'ignore' });
        } catch (e) {
            // Process might have already exited
            console.log('Could not terminate process tree or process already exited.');
        }
      } else {
        process.kill(-serverProcess.pid, 'SIGKILL');
      }
    }
  }
})();
