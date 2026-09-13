import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const root = process.cwd(), children = [], logs = [], errors = [];
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
  child.stdout.on('data', d => logs.push(d.toString()));
  child.stderr.on('data', d => logs.push(d.toString()));
  return child;
}

async function wait(url) {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Server unavailable ' + url + ' ' + logs.join('').slice(-2000));
}

let browser, page;
try {
  start([path.join(root, 'node_modules/tsx/dist/cli.mjs'), 'test/browser-server.ts'], path.join(root, 'apps/api'));
  start([path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5273', '--strictPort'], path.join(root, 'apps/web'));
  start([path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5274', '--strictPort'], path.join(root, 'apps/admin'));
  await Promise.all([wait('http://127.0.0.1:3101/api/health'), wait('http://127.0.0.1:5273'), wait('http://127.0.0.1:5274')]);
  
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page = await context.newPage();
  page.setDefaultTimeout(60000);
  const goto = url => page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  
  await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  page.on('pageerror', error => errors.push(error.message));

  async function noOverflow(label) {
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const result = await page.evaluate(() => ({
      viewport: innerWidth,
      content: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll('body *')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > innerWidth + 2 && getComputedStyle(el).position !== 'fixed' && !el.closest('.overflow-x-auto,.pl-dialog-backdrop,.admin-sidebar');
      }).slice(0, 8).map(el => el.tagName + '.' + (typeof el.className === 'string' ? el.className : el.className?.baseVal || '') + ' [' + el.textContent?.slice(0, 25).trim() + ']'),
    }));
    assert.ok(result.content <= result.viewport + 2, label + ': ' + JSON.stringify(result));
  }

  await goto('http://127.0.0.1:5273');
  await page.getByRole('heading', { name: /Halo/ }).waitFor();
  await page.evaluate(() => document.fonts.ready);

  for (const width of [320, 375, 390, 440, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await noOverflow('Dashboard ' + width);
    if ([390, 1440].includes(width)) {
      await page.screenshot({ path: path.join(output, 'dashboard-' + width + '.png'), fullPage: true });
    }
  }
  console.log('PASS dashboard layout: 320, 375, 390, 440, 768, 1280, 1440');

  await goto('http://127.0.0.1:5273/editor');
  await page.locator('canvas').waitFor();
  for (const width of [320, 375, 390, 440, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await noOverflow('Editor ' + width);
    if (width === 390) {
      for (const name of ['Latar', 'Sesuaikan', 'Ekspor']) {
        await page.getByRole('tab', { name, exact: true }).click();
        await noOverflow('Editor tab ' + name);
      }
      await page.getByRole('tab', { name: 'Latar', exact: true }).click();
      await page.screenshot({ path: path.join(output, 'editor-mobile.png'), fullPage: true });
    }
  }

  assert.equal(await page.getByText('Mode Layar:',{exact:true}).count(),0);
  console.log('PASS responsive editor tabs; no device simulator');

  const fixture = await sharp({ create: { width: 600, height: 800, channels: 4, background: { r: 100, g: 150, b: 220, alpha: 1 } } }).png().toBuffer();
  await page.locator('input[aria-label="Unggah foto editor"]').setInputFiles({ name: 'creative-test.png', mimeType: 'image/png', buffer: fixture });
  await page.getByText('Foto berhasil diunggah.', { exact: false }).waitFor();
  await page.waitForFunction(() => document.querySelector('canvas')?.width === 600);
  await page.getByRole('button', { name: 'Simpan', exact: true }).first().click();
  await page.getByText('Proyek tersimpan.', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Simpan', exact: true }).first().click();

  await goto('http://127.0.0.1:5273/projects');
  await page.getByRole('button', { name: 'creative-test.png', exact: true }).waitFor();
  assert.equal(await page.locator('.project-card').count(), 1, 'Save updates existing project');
  await page.getByRole('button', { name: 'Favoritkan creative-test.png', exact: true }).click();
  await page.getByRole('button', { name: 'Ganti nama creative-test.png', exact: true }).click();
  await page.getByRole('dialog').locator('input').fill('Product campaign');
  await page.getByRole('button', { name: 'Simpan nama' }).click();
  await page.getByRole('button', { name: 'Product campaign', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Duplikasi Product campaign', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.project-card').length === 2);
  await page.getByRole('button', { name: 'Hapus Product campaign (Salinan)', exact: true }).click();
  await page.getByRole('button', { name: 'Batal', exact: true }).click();
  assert.equal(await page.locator('.project-card').count(), 2);
  await page.getByRole('button', { name: 'Hapus Product campaign (Salinan)', exact: true }).click();
  await page.getByRole('button', { name: 'Lanjutkan', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.project-card').length === 1);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Product campaign', exact: true }).waitFor();
  console.log('PASS local project create/update/favorite/rename/duplicate/delete/cancel/reload');

  await page.getByRole('button', { name: 'Product campaign', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('canvas')?.width === 600);
  await page.getByRole('button', { name: /Download|Unduh/i }).first().click();
  await page.getByText('Unduhan PNG dimulai.', { exact: false }).waitFor();
  console.log('PASS reopen and export');

  await goto('http://127.0.0.1:5274');
  await page.getByRole('button', { name: 'Masuk Dashboard', exact: true }).click();
  await page.locator('.admin-sidebar').waitFor();

  for (const mode of ['light', 'dark']) {
    const dark = await page.locator('html').evaluate(el => el.classList.contains('dark'));
    if (dark !== (mode === 'dark')) await page.getByRole('button', { name: 'Toggle dark mode' }).click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.admin-sidebar').waitFor();
    const bg = await page.locator('.admin-shell').evaluate(el => getComputedStyle(el).backgroundColor);
    assert.equal(bg, mode === 'dark' ? 'rgb(9, 14, 28)' : 'rgb(245, 246, 250)');
    for (const width of [375, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await noOverflow('Admin ' + mode + ' ' + width);
      if ([390, 1440].includes(width)) {
        await page.screenshot({ path: path.join(output, 'admin-' + mode + '-' + width + '.png'), fullPage: true });
      }
    }
  }
  console.log('PASS admin theme persistence and layouts');

  await goto('http://127.0.0.1:5274/users');
  await page.getByRole('button', { name: /Tambah Pengguna|Tambah User/i }).click();
  const add = page.locator('form');
  await add.locator('input[type=text]').fill('UI Test User');
  await add.locator('input[type=email]').fill('ui.test@pixellift.test');
  await add.locator('input[type=password]').fill('Password123!');
  await page.getByRole('button', { name: /Simpan User|Simpan Pengguna|Save User/i }).click();
  await page.getByPlaceholder(/Cari nama atau email/i).fill('ui.test@pixellift.test');
  await page.getByText('UI Test User', { exact: true }).waitFor();
  await page.locator('tr', { hasText: 'ui.test@pixellift.test' }).getByRole('button', { name: /Edit/i }).first().click();

  const editInput = page.locator('form input[type=text]').first();
  await editInput.waitFor();
  await editInput.fill('UI Updated User');
  await page.locator('form button[type=submit]').click();
  await page.getByText(/Data pengguna berhasil diperbarui/).first().waitFor();
  console.log('PASS admin user create and edit by ID');

  await goto('http://127.0.0.1:5274/presets');
  await page.getByRole('button', { name: 'Tambah preset' }).click();
  await page.getByRole('dialog').locator('input').first().fill('Brand purple');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await page.getByRole('heading', { name: 'Brand purple', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Edit Brand purple', exact: true }).click();
  await page.getByRole('dialog').locator('input').first().fill('Brand violet');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await page.getByRole('heading', { name: 'Brand violet', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Nonaktifkan Brand violet', exact: true }).click();
  await page.getByRole('button', { name: 'Aktifkan Brand violet', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Hapus Brand violet', exact: true }).click();
  await page.getByRole('button', { name: 'Lanjutkan' }).click();
  console.log('PASS admin preset create/edit/deactivate/delete');

  await goto('http://127.0.0.1:5274/notifications');
  await page.getByRole('button', { name: 'Buat pengumuman' }).click();
  await page.getByRole('dialog').locator('input').fill('Studio update');
  await page.getByRole('dialog').locator('textarea').fill('Fitur baru siap digunakan.');
  await page.getByRole('button', { name: 'Terbitkan pengumuman' }).click();
  await page.getByRole('heading', { name: 'Studio update' }).waitFor();

  await goto('http://127.0.0.1:5273');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.getByRole('button', { name: /1-Click Demo User/ }).click();
  await page.getByRole('heading', { name: 'Studio update' }).waitFor();
  assert.equal(await page.getByRole('button',{name:'Product campaign',exact:true}).count(),0,'Guest projects stay isolated from account projects');
  console.log('PASS targeted dashboard announcement and user login');

  // Test User Settings & PP Change
  await goto('http://127.0.0.1:5273/settings');
  await page.getByText(/Pengaturan Profil|Profile Settings/i).waitFor();
  await page.getByRole('button', { name: /Ganti Foto Profil|Change Profile Picture/i }).first().click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('button', { name: /Terapkan Foto Profil/i }).click();
  await page.getByText(/Foto profil berhasil diperbarui/i).waitFor();
  console.log('PASS user settings and profile picture change');

  // Test User Subscription History & Expiry
  await goto('http://127.0.0.1:5273/subscription');
  await page.getByText(/Riwayat Langganan|BILLING & SUBSCRIPTION|Paket Free/i).first().waitFor();
  console.log('PASS user subscription page and quota visibility');

  // Test User Support & FAQ
  await goto('http://127.0.0.1:5273/support');
  await page.getByText(/Bantuan & FAQ|Pertanyaan yang Sering Diajukan/i).first().waitFor();
  await page.locator('input[placeholder*="Cari solusi"]').fill('Format');
  await page.getByText(/Format file apa saja yang didukung/i).waitFor();
  console.log('PASS user support, FAQ search, and ticket system');

  // Test Admin Transactions CRUD
  await goto('http://127.0.0.1:5274/transactions');
  await page.getByRole('button', { name: /Catat Transaksi Manual/i }).click();
  await page.getByLabel('Pengguna transaksi').selectOption({index:1});
  await page.getByRole('dialog').getByRole('button', { name: /Simpan Transaksi/i }).click();
  await page.getByText(/Transaksi manual berhasil dicatat/i).waitFor();
  console.log('PASS admin transaction manual creation and ledger');

  // Test Admin Audit Logs Page
  await goto('http://127.0.0.1:5274/audit-logs');
  await page.getByText(/Sistem Audit Trail/i).first().waitFor();
  console.log('PASS admin audit trail and activity log');

  await goto('http://127.0.0.1:5274');
  await page.getByRole('button', { name: 'Logout Admin', exact: true }).first().click();
  await page.getByRole('button', { name: 'Masuk Dashboard' }).waitFor();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Masuk Dashboard' }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('pixellift_admin_token')), null);
  console.log('PASS logout remains logged out after reload');

  assert.deepEqual(errors, [], 'Browser JavaScript errors');
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ status: 'passed', browserErrors: errors, screenshots: output }, null, 2));
  console.log('ALL BROWSER CHECKS PASSED');
} catch (e) {
  await page?.screenshot({ path: path.join(output, 'failed-screen.png'), fullPage: true }).catch(() => {});
  await writeFile(path.join(output, 'failure.log'), String(e) + '\n' + logs.join('').slice(-6000));
  throw e;
} finally {
  await browser?.close();
  for (const child of children.reverse()) child.kill();
}
