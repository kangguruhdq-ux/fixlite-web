import sharp from 'sharp';
import fs from 'node:fs';
import { getBackgroundRemovalService } from '../packages/services/src/index.ts';

async function test() {
  const buf = fs.readFileSync('apps/web/public/demo-portrait.jpg');
  console.log('Testing ISNet service...');
  const isnet = getBackgroundRemovalService('ISNet');
  const t0 = Date.now();
  const res = await isnet.removeBackground(buf, { confidenceThreshold: 50, refinementLevel: 'high' });
  console.log('Done in', Date.now() - t0, 'ms. Model:', res.modelUsed);
  fs.writeFileSync('artifacts/ai-review/test_isnet_service.png', res.resultBuffer);
  console.log('Saved test_isnet_service.png');
}

test().catch(console.error);
