import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const root=process.cwd(), children=[], logs=[], errors=[];
const output=path.join(root,'artifacts','ui-review');
await mkdir(output,{recursive:true});
function start(args,cwd){const child=spawn(process.execPath,args,{cwd,env:{...process.env,NODE_ENV:'test',PIXELIFT_API_TARGET:'http://127.0.0.1:3101'},windowsHide:true,stdio:['ignore','pipe','pipe']});children.push(child);child.stdout.on('data',d=>logs.push(d.toString()));child.stderr.on('data',d=>logs.push(d.toString()));return child;}
async function wait(url){for(let i=0;i<80;i++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,500));}throw new Error('Server unavailable '+url+' '+logs.join('').slice(-2000));}
let browser;
try{
 start([path.join(root,'node_modules/tsx/dist/cli.mjs'),'test/browser-server.ts'],path.join(root,'apps/api'));
 start([path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5273','--strictPort'],path.join(root,'apps/web'));
 start([path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5274','--strictPort'],path.join(root,'apps/admin'));
 await Promise.all([wait('http://127.0.0.1:3101/api/health'),wait('http://127.0.0.1:5273'),wait('http://127.0.0.1:5274')]);
 browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage();
 const goto=url=>page.goto(url,{waitUntil:'domcontentloaded'});
 await context.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
 page.on('pageerror',error=>errors.push(error.message));
 async function noOverflow(label){const result=await page.evaluate(()=>({viewport:innerWidth,content:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0 && r.right>innerWidth+2 && getComputedStyle(el).position!=='fixed' && !el.closest('.overflow-x-auto,.pl-dialog-backdrop,.admin-sidebar,.overflow-x-auto');}).slice(0,8).map(el=>el.className)}));assert.ok(result.content<=result.viewport+2,label+': '+JSON.stringify(result));}

 await page.setViewportSize({width:375,height:900});
 await goto('http://127.0.0.1:5274');
 await page.getByRole('button',{name:'Masuk Dashboard'}).click();
 await page.locator('.admin-sidebar').waitFor({state:'attached'});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await page.screenshot({path:path.join(output,'admin-inspect.png'),fullPage:true});
 console.log(JSON.stringify(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,nodes:[...document.querySelectorAll('.admin-shell,.admin-content,.admin-topbar,.admin-topbar-title,.admin-topbar-actions,.admin-content>main,.admin-content>main>div,.admin-page-heading,.admin-search-trigger')].map(el=>({tag:el.className,width:el.getBoundingClientRect().width,right:el.getBoundingClientRect().right,display:getComputedStyle(el).display,minWidth:getComputedStyle(el).minWidth,marginLeft:getComputedStyle(el).marginLeft})),overflow:[...document.querySelectorAll('.admin-content *')].filter(el=>el.getBoundingClientRect().right>innerWidth+2&&!el.closest('.overflow-x-auto')).slice(0,25).map(el=>({tag:el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width}))})),null,2));
}finally{await browser?.close();for(const child of children.reverse())child.kill();}
