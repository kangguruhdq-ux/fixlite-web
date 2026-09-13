import sharp from 'sharp';
import { InferenceSession, Tensor } from 'onnxruntime-node';
import fs from 'node:fs';

async function run() {
  const engine = await InferenceSession.create('packages/services/models/isnet-general-use.onnx', {
    executionProviders: ['cpu'],
    intraOpNumThreads: 4,
  });

  console.log('ISNet inputs:', engine.inputNames, 'outputs:', engine.outputNames);
  const inputMeta = engine.inputNames[0];
  console.log('Input meta:', inputMeta);

  const buf = fs.readFileSync('apps/web/public/demo-portrait.jpg');
  const size = 1024;
  const { data: original, info } = await sharp(buf).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rgb = await sharp(original, { raw: info }).removeAlpha().resize(size, size, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer();
  
  // ISNet normalization: (x/255.0 - 0.5) / 1.0 or x/255.0? In rembg, ISNet uses mean=[0.5, 0.5, 0.5], std=[1.0, 1.0, 1.0]
  const input = new Float32Array(3 * size * size);
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < size * size; i++) {
      input[c * size * size + i] = (rgb[i * 3 + c] / 255.0 - 0.5) / 1.0;
    }
  }

  const t0 = Date.now();
  const outputs = await engine.run({ [engine.inputNames[0]]: new Tensor('float32', input, [1, 3, size, size]) });
  console.log('ISNet inference took', Date.now() - t0, 'ms');
  const prediction = outputs[engine.outputNames[0]].data;

  let low = Infinity, high = -Infinity;
  for (let i = 0; i < prediction.length; i++) {
    low = Math.min(low, prediction[i]);
    high = Math.max(high, prediction[i]);
  }
  console.log('ISNet output range:', low, high);

  // Check pixel at shadow (x=68%, y=35%)
  const x = Math.floor(size * 0.68);
  const y = Math.floor(size * 0.35);
  const shadowVal = (prediction[y * size + x] - low) / (high - low);
  console.log('ISNet shadow pixel value:', prediction[y * size + x], 'normalized:', shadowVal);

  const mask = Buffer.alloc(size * size);
  for (let i = 0; i < mask.length; i++) {
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
  fs.writeFileSync('artifacts/ai-review/test_isnet.png', resBuffer);
  console.log('Saved artifacts/ai-review/test_isnet.png');
}

run().catch(console.error);
