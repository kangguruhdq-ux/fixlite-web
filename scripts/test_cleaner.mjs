import sharp from 'sharp';
import { InferenceSession, Tensor } from 'onnxruntime-node';
import fs from 'node:fs';

async function testCleaner() {
  const buf = fs.readFileSync('apps/web/public/demo-portrait.jpg');
  const engine = await InferenceSession.create('packages/services/models/isnet-general-use.onnx', {
    executionProviders: ['cpu'],
    intraOpNumThreads: 4,
  });

  const size = 1024;
  const { data: original, info } = await sharp(buf).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rgb = await sharp(original, { raw: info }).removeAlpha().resize(size, size, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer();
  
  const input = new Float32Array(3 * size * size);
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < size * size; i++) {
      input[c * size * size + i] = (rgb[i * 3 + c] / 255.0 - 0.5) / 1.0;
    }
  }

  const outputs = await engine.run({ [engine.inputNames[0]]: new Tensor('float32', input, [1, 3, size, size]) });
  const prediction = outputs[engine.outputNames[0]].data;

  // Let's test a few threshold curves:
  // Low cutoff at 0.3, high cutoff at 0.7
  const lowCut = 0.35, highCut = 0.75;
  const mask = Buffer.alloc(size * size);
  for (let i = 0; i < mask.length; i++) {
    const val = prediction[i];
    if (val <= lowCut) {
      mask[i] = 0;
    } else if (val >= highCut) {
      mask[i] = 255;
    } else {
      const t = (val - lowCut) / (highCut - lowCut);
      // smoothstep: 3t^2 - 2t^3
      mask[i] = Math.round((3 * t * t - 2 * t * t * t) * 255);
    }
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
  fs.writeFileSync('artifacts/ai-review/test_cleaner.png', resBuffer);
  console.log('Saved test_cleaner.png');
}

testCleaner().catch(console.error);
