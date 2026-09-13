import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const children = [];
const output = path.join(root, 'artifacts', 'ui-review');
await mkdir(output, { recursive: true });

function start(args, cwd) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, NODE_ENV: 'test', PIXELIFT_API_TARGET: 'http://127.0.0.1:3101' },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  return child;
}

async function wait(url) {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Server unavailable ' + url);
}

let browser;
try {
  start([path.join(root, 'node_modules/tsx/dist/cli.mjs'), 'test/browser-server.ts'], path.join(root, 'apps/api'));
  start([path.join(root, 'node_modules/vite/bin/vite.js'), '--force', '--host', '127.0.0.1', '--port', '5273', '--strictPort'], path.join(root, 'apps/web'));
  start([path.join(root, 'node_modules/vite/bin/vite.js'), '--force', '--host', '127.0.0.1', '--port', '5274', '--strictPort'], path.join(root, 'apps/admin'));
  await Promise.all([wait('http://127.0.0.1:3101/api/health'), wait('http://127.0.0.1:5273'), wait('http://127.0.0.1:5274')]);

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  const page = await context.newPage();
  const goto = url => page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err));

  // 1. Login to Admin
  await goto('http://127.0.0.1:5274');
  await page.getByRole('button', { name: /Masuk Dashboard|Login/i }).click();
  await page.locator('.admin-sidebar').waitFor();

  // 2. Capture Admin Overview (Indonesian)
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(output, 'admin-overview-id.png'), fullPage: true });
  console.log('Captured admin-overview-id.png');

  // 3. Switch Language to English
  console.log('Step 3: Finding and clicking Language Toggle...');
  await page.locator('button[aria-label="Language Toggle"]').click();
  const currentLang = await page.evaluate(() => localStorage.getItem('pixellift_lang'));
  console.log('Step 3 Result: Language switched to', currentLang);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // 4. Capture Admin Overview (English)
  console.log('Step 4: Capturing admin-overview-en.png...');
  await page.screenshot({ path: path.join(output, 'admin-overview-en.png'), fullPage: true });
  console.log('Captured admin-overview-en.png');

  // 5. Navigate to Users page in English
  await goto('http://127.0.0.1:5274/users');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(output, 'admin-users-en.png'), fullPage: true });
  console.log('Captured admin-users-en.png');

  // 6. Navigate to Transactions page in English
  await goto('http://127.0.0.1:5274/transactions');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(output, 'admin-transactions-en.png'), fullPage: true });
  console.log('Captured admin-transactions-en.png');

  // 7. Check Studio Editor AI Model Selector
  await goto('http://127.0.0.1:5273/editor');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(output, 'studio-editor-model-selector.png'), fullPage: true });
  console.log('Captured studio-editor-model-selector.png');

  console.log('ALL VERIFICATION SCREENSHOTS CAPTURED SUCCESSFULLY!');
} catch (err) {
  console.error('VERIFICATION FAILED WITH ERROR:', err);
} finally {
  await browser?.close();
  for (const child of children.reverse()) child.kill();
}
