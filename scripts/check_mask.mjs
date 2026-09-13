import sharp from 'sharp';
import fs from 'node:fs';

async function check() {
  const buf = fs.readFileSync('artifacts/ai-review/test_human_seg.png');
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  
  // Let's create an image showing the alpha channel alone
  const alphaOnly = Buffer.alloc(info.width * info.height);
  for (let i = 0; i < alphaOnly.length; i++) {
    alphaOnly[i] = data[i * 4 + 3];
  }

  await sharp(alphaOnly, { raw: { width: info.width, height: info.height, channels: 1 } })
    .png()
    .toFile('artifacts/ai-review/mask_human_seg.png');
  console.log('Saved mask_human_seg.png');
}
check().catch(console.error);
