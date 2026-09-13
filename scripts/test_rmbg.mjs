import sharp from 'sharp';
import { InferenceSession, Tensor } from 'onnxruntime-node';
import fs from 'node:fs';

async function testRmbg() {
  console.log('Loading RMBG-1.4 session...');
  const t0 = Date.now();
  const engine = await InferenceSession.create('d:/project/fixlite-web/packages/services/models/rmbg-1.4.onnx', {
    executionProviders: ['cpu'],
    intraOpNumThreads: 4,
  });
  console.log('Loaded in', Date.now() - t0, 'ms');
  console.log('Inputs:', engine.inputNames, 'Outputs:', engine.outputNames);

  const buf = fs.readFileSync('d:/project/fixlite-web/apps/web/public/demo-portrait.jpg');
  const size = 1024;
  const { data: original, info } = await sharp(buf).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rgb = await sharp(original, { raw: info }).removeAlpha().resize(size, size, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer();

  const input = new Float32Array(3 * size * size);
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < size * size; i++) {
      // RMBG normalization: (pixel / 255.0 - 0.5) / 1.0
      input[c * size * size + i] = (rgb[i * 3 + c] / 255.0 - 0.5) / 1.0;
    }
  }

  const tInf = Date.now();
  const outputs = await engine.run({ [engine.inputNames[0]]: new Tensor('float32', input, [1, 3, size, size]) });
  console.log('Inference took', Date.now() - tInf, 'ms');

  const raw = outputs[engine.outputNames[0]].data;
  console.log('Raw output length:', raw.length);

  // Check min and max
  let low = Infinity, high = -Infinity;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] < low) low = raw[i];
    if (raw[i] > high) high = raw[i];
  }
  console.log('Min:', low, 'Max:', high);

  // Check sample points:
  console.log('Wall (100, 100):', raw[100 * 1024 + 100]);
  console.log('Forehead (512, 350):', raw[350 * 1024 + 512]);
  console.log('Shadow right (700, 350):', raw[350 * 1024 + 700]);

  // Generate mask
  const mask = Buffer.alloc(size * size);
  for (let i = 0; i < mask.length; i++) {
    const val = (raw[i] - low) / (high - low);
    mask[i] = Math.round(Math.min(255, Math.max(0, val * 255)));
  }

  const alpha = await sharp(mask, { raw: { width: size, height: size, channels: 1 } })
    .resize(info.width, info.height, { kernel: 'lanczos3' })
    .greyscale()
    .raw()
    .toBuffer();

  const origBuffer = Buffer.from(original);
  for (let i = 0; i < alpha.length; i++) {
    origBuffer[i * 4 + 3] = alpha[i];
  }

  const resBuffer = await sharp(origBuffer, { raw: info }).png().toBuffer();
  fs.writeFileSync('d:/project/fixlite-web/artifacts/ai-review/rmbg-result.png', resBuffer);
  fs.writeFileSync('C:/Users/KPTI_27/.gemini/antigravity/brain/d2d16480-e5c2-4a8f-b931-ea6936ba913d/rmbg-result.png', resBuffer);
  console.log('Saved rmbg-result.png successfully!');
}

testRmbg().catch(console.error);
