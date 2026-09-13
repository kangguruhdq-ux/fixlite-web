import sharp from 'sharp';
import { InferenceSession, Tensor } from 'onnxruntime-node';
import fs from 'node:fs';

async function run() {
  const buf = fs.readFileSync('apps/web/public/demo-portrait.jpg');
  console.log('Loading u2net_human_seg...');
  const engine = await InferenceSession.create('packages/services/models/u2net_human_seg.onnx', {
    executionProviders: ['cpu'],
    intraOpNumThreads: 2,
    interOpNumThreads: 1,
    graphOptimizationLevel: 'all',
  });

  const size = 320;
  const { data: original, info } = await sharp(buf).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rgb = await sharp(original, { raw: info }).removeAlpha().resize(size, size, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer();
  
  const input = new Float32Array(3 * size * size);
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < size * size; i++) {
      input[c * size * size + i] = (rgb[i * 3 + c] / 255.0 - mean[c]) / std[c];
    }
  }

  const t0 = Date.now();
  const outputs = await engine.run({ [engine.inputNames[0]]: new Tensor('float32', input, [1, 3, size, size]) });
  console.log('Inference took', Date.now() - t0, 'ms');
  const prediction = outputs[engine.outputNames[0]].data;

  let low = Infinity, high = -Infinity;
  for (let i = 0; i < size * size; i++) {
    low = Math.min(low, prediction[i]);
    high = Math.max(high, prediction[i]);
  }
  console.log('Prediction range:', low, high);

  const mask = Buffer.alloc(size * size);
  for (let i = 0; i < mask.length; i++) {
    // Standard probability normalization
    const val = (prediction[i] - low) / (high - low);
    mask[i] = Math.round(Math.max(0, Math.min(1, val)) * 255);
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
  fs.writeFileSync('artifacts/ai-review/test_human_seg.png', resBuffer);
  console.log('Saved artifacts/ai-review/test_human_seg.png');
}

run().catch(console.error);
