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
      }).slice(0, 8).map(el => el.className),
    }));
    assert.ok(result.content <= result.viewport + 2, label + ': ' + JSON.stringify(result));
  }


  const login=async email=>{const r=await fetch('http://127.0.0.1:3101/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'Demo123!'})});assert.equal(r.status,200);return r.json();};
  const user=await login('user@pixellift.test'),admin=await login('admin@pixellift.test');
  const call=async(path,method='GET',body,token=admin.token)=>{
   const r=await fetch('http://127.0.0.1:3101/api'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
   const data=await r.json();assert.ok(r.ok,path+': '+JSON.stringify(data));return data;
  };
  await context.addInitScript(({u,a})=>{localStorage.setItem('pixellift_token',u);localStorage.setItem('pixellift_admin_token',a);},{u:user.token,a:admin.token});
  await goto('http://127.0.0.1:5273/editor');
  await page.locator('canvas').waitFor();
  await page.locator('[aria-label="Unggah foto editor"]').setInputFiles(path.join(root,'apps/web/public/demo-portrait.jpg'));
  await page.getByRole('button',{name:'Remove Background',exact:true}).click();
  await page.getByText('Background berhasil dihapus',{exact:false}).waitFor();
  await page.waitForFunction(()=>{const c=document.querySelector('canvas');return c&&c.getContext('2d').getImageData(0,0,1,1).data[3]<30;});
  const snapshot=()=>page.locator('canvas').evaluate(c=>c.toDataURL());
  const assertChanged=async(before,label)=>{await page.waitForFunction(b=>document.querySelector('canvas').toDataURL()!==b,before);console.log('PASS '+label);};
  const setRange=async(name,value)=>page.getByRole('slider',{name,exact:true}).evaluate((el,v)=>{
   Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));
   el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
  },value);
  await page.screenshot({path:path.join(output,'editor-real-ai.png'),fullPage:true});
  for(const [tab,names] of [['basic',['Exposure','Brightness','Contrast','Highlights','Shadows','Whites','Blacks']],['color',['Temperature (Kelvin)','Tint','Saturation','Vibrance','Hue']],['detail',['Sharpness','Clarity','Blur','Grain','Vignette']]]) {
   await page.getByRole('button',{name:tab,exact:true}).click();
   for(const name of names){const before=await snapshot();await setRange(name,40);await assertChanged(before,'slider '+name);await setRange(name,0);}
  }
  await page.getByRole('button',{name:'transform',exact:true}).click();
  const dimensions=await page.locator('canvas').evaluate(c=>({w:c.width,h:c.height}));
  await page.getByRole('button',{name:/^90/}).click();
  await page.waitForFunction(d=>{const c=document.querySelector('canvas');return c.width===d.h&&c.height===d.w;},dimensions);
  for(const name of ['Flip H','Flip V']){const before=await snapshot();await page.getByRole('button',{name,exact:true}).click();await assertChanged(before,name);}
  await page.getByRole('button',{name:'1:1',exact:true}).click();
  await page.waitForFunction(()=>{const c=document.querySelector('canvas');return c.width===c.height;});
  console.log('PASS rotation dimensions, flips and crop');
  await page.getByRole('button',{name:'Original',exact:true}).first().click();
  const beforeBrush=await snapshot();
  await page.getByLabel('Perbaikan manual').check({force:true});
  const canvas=page.locator('canvas');await canvas.scrollIntoViewIfNeeded();
  const box=await canvas.boundingBox();await page.mouse.click(box.x+box.width*.5,box.y+box.height*.5);
  await assertChanged(beforeBrush,'brush after rotation');
  await page.getByLabel('Perbaikan manual').uncheck({force:true});
  await page.waitForTimeout(400);
  const afterBrush=await snapshot();
  await page.getByTitle('Undo (Ctrl+Z)').click();await assertChanged(afterBrush,'undo brush');
  await page.getByTitle('Redo (Ctrl+Y)').click();
  await page.getByRole('button',{name:'Watermark',exact:true}).click();
  await page.getByLabel('Aktifkan watermark').check({force:true});
  const beforeText=await snapshot();
  await page.getByPlaceholder('Masukkan nama toko / teks...').fill('PIXELIFT TEST');
  await assertChanged(beforeText,'custom watermark');
  await page.getByLabel('Bayangan produk').check({force:true});
  await page.getByRole('button',{name:'Solid Color',exact:true}).click();
  await page.getByTitle('White',{exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('canvas').getContext('2d').getImageData(0,0,1,1).data[3]===255);
  console.log('PASS solid background, watermark and shadow controls');
  for(const format of ['PNG','JPG','WEBP']) {
   await page.getByRole('button',{name:format,exact:true}).click();
   await page.getByRole('button',{name:'Small',exact:true}).click();
   const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'Download',exact:true}).click();
   const download=await waiting;const file=path.join(output,'export-test.'+format.toLowerCase());await download.saveAs(file);
   const meta=await sharp(file).metadata();assert.equal(meta.format,format==='JPG'?'jpeg':format.toLowerCase());assert.ok(meta.width>0&&meta.height>0);
  }
  await page.getByRole('button',{name:'Simpan',exact:true}).click();
  await page.getByText('Proyek tersimpan.',{exact:false}).waitFor();
  const projects=await call('/projects?search=demo-portrait');
  assert.equal(projects.data.length,1);assert.equal(projects.data[0].userId,user.user.id);assert.equal(projects.data[0].settings.watermark.text,'PIXELIFT TEST');
  const savedId=projects.data[0].id;
  await page.reload({waitUntil:'domcontentloaded'});
  await goto('http://127.0.0.1:5273/editor?project='+savedId);
  await page.waitForFunction(()=>document.querySelector('canvas')?.width>0);
  console.log('PASS real project synced to admin with editable settings');
  await goto('http://127.0.0.1:5274/support-tickets');
  await page.getByRole('button',{name:/FAQ Interaktif/}).click();
  await page.getByRole('button',{name:'Tambah FAQ Baru'}).click();
  let dialog=page.getByRole('dialog');
  await dialog.getByPlaceholder('Contoh: Bagaimana cara menghapus background massal?').fill('Cara uji sinkronisasi studio?');
  await dialog.getByPlaceholder('Tuliskan jawaban yang lengkap, jelas, dan ramah...').fill('Jawaban studio versi pertama.');
  await dialog.getByRole('button',{name:'Simpan FAQ'}).click();
  await page.getByPlaceholder('Cari pertanyaan FAQ...').fill('sinkronisasi studio');
  await page.getByTitle('Edit FAQ').click();
  await page.getByRole('dialog').getByPlaceholder('Tuliskan jawaban yang lengkap, jelas, dan ramah...').fill('Jawaban terbaru dari admin.');
  await page.getByRole('button',{name:'Simpan FAQ',exact:true}).click();
  await goto('http://127.0.0.1:5273/support');
  await page.getByPlaceholder(/Cari solusi/).fill('sinkronisasi studio');
  await page.getByText('Cara uji sinkronisasi studio?',{exact:true}).click();
  await page.getByText('Jawaban terbaru dari admin.',{exact:true}).waitFor();
  console.log('PASS FAQ create/edit in admin visible to user');
  await goto('http://127.0.0.1:5274/support-tickets');
  await page.getByRole('button',{name:'Pengetahuan Chatbot',exact:true}).click();
  await page.getByRole('button',{name:'Tambah Jawaban Bot',exact:true}).click();
  dialog=page.getByRole('dialog');
  await dialog.getByPlaceholder('Contoh: Cara Pakai Batch Removal').fill('Panduan sinkronisasi');
  await dialog.getByPlaceholder('Contoh: batch, massal, zip').fill('sinkronisasi, proyekcloud');
  await dialog.getByPlaceholder('Tuliskan respon penjelasan AI bot...').fill('Proyek akun tersimpan pada database aplikasi.');
  await dialog.getByRole('button',{name:'Simpan Pengetahuan'}).click();
  await goto('http://127.0.0.1:5273/support');
  await page.getByRole('button',{name:'Asisten Bantuan',exact:true}).click();
  await page.getByRole('button',{name:'Panduan sinkronisasi',exact:true}).click();
  await page.getByText('Proyek akun tersimpan pada database aplikasi.',{exact:true}).waitFor();
  console.log('PASS managed chatbot questions and answers');
  for(const target of ['/','/analytics','/projects','/support-tickets','/settings','/users']) {
   await goto('http://127.0.0.1:5274'+target);
   await page.locator('.admin-content main').waitFor();
   for(const width of [320,375,768,1440]){await page.setViewportSize({width,height:1000});await noOverflow('Admin '+target+' '+width);}
  }
  await goto('http://127.0.0.1:5274/analytics');
  await page.getByLabel('Periode analitik').selectOption('7d');
  await page.getByRole('button',{name:'Tabel',exact:true}).click();
  await page.locator('.analytics-table tbody tr').first().waitFor();
  const csvWaiting=page.waitForEvent('download');await page.getByRole('button',{name:'CSV',exact:true}).click();await (await csvWaiting).saveAs(path.join(output,'analytics.csv'));
  console.log('PASS admin responsive pages, analytics period/table/CSV');
  await page.screenshot({path:path.join(output,'analytics-desktop.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  await writeFile(path.join(output,'workflow-results.json'),JSON.stringify({status:'passed',errors},null,2));
  console.log('ALL LIVE WORKFLOW CHECKS PASSED');
} catch (e) {
  await page?.screenshot({ path: path.join(output, 'failed-screen.png'), fullPage: true }).catch(() => {});
  await writeFile(path.join(output, 'failure.log'), String(e) + '\n' + logs.join('').slice(-6000));
  throw e;
} finally {
  await browser?.close();
  for (const child of children.reverse()) child.kill();
}
