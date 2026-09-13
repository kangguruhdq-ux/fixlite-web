import sharp from 'sharp';
import fs from 'node:fs';

async function check(file) {
  const buf = fs.readFileSync(file);
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  
  const x = Math.floor(info.width * 0.68);
  const y = Math.floor(info.height * 0.35);
  const idx = (y * info.width + x) * 4;
  console.log(file, 'at (x=68%, y=35%): A=', data[idx+3]);
}

async function main() {
  await check('artifacts/ai-review/birefnet-portrait.png');
  await check('artifacts/ai-review/u2net-portrait.png');
  await check('artifacts/ai-review/test_human_seg.png');
}
main().catch(console.error);
