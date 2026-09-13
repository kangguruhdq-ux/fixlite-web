import sharp from 'sharp';
import fs from 'node:fs';

async function check() {
  const buf = fs.readFileSync('artifacts/ai-review/birefnet-portrait.png');
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  
  // check pixel at (width * 0.68, height * 0.35)
  const x = Math.floor(info.width * 0.68);
  const y = Math.floor(info.height * 0.35);
  const idx = (y * info.width + x) * 4;
  console.log('BiRefNet at (x=68%, y=35%): R=', data[idx], 'G=', data[idx+1], 'B=', data[idx+2], 'A=', data[idx+3]);

  // check pixel at (width * 0.1, height * 0.1)
  const x0 = Math.floor(info.width * 0.1);
  const y0 = Math.floor(info.height * 0.1);
  const idx0 = (y0 * info.width + x0) * 4;
  console.log('BiRefNet at (x=10%, y=10%): R=', data[idx0], 'G=', data[idx0+1], 'B=', data[idx0+2], 'A=', data[idx0+3]);

  // check pixel at (width * 0.85, height * 0.35)
  const x1 = Math.floor(info.width * 0.85);
  const y1 = Math.floor(info.height * 0.35);
  const idx1 = (y1 * info.width + x1) * 4;
  console.log('BiRefNet at (x=85%, y=35%): R=', data[idx1], 'G=', data[idx1+1], 'B=', data[idx1+2], 'A=', data[idx1+3]);
}
check().catch(console.error);
