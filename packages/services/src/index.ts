import sharp from 'sharp';
import { InferenceSession, Tensor } from 'onnxruntime-node';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface RemovalOptions {
  confidenceThreshold?: number;
  refinementLevel?: 'standard' | 'high' | 'ultra';
  returnMaskOnly?: boolean;
  edgeFeathering?: number;
}

export interface RemovalResult {
  resultBuffer: Buffer;
  maskBuffer?: Buffer;
  executionTimeMs: number;
  confidence: number | null;
  modelUsed: string;
}

export interface IBackgroundRemovalService {
  name: string;
  removeBackground(imageBuffer: Buffer, options?: RemovalOptions): Promise<RemovalResult>;
}

export type ModelKey = 'ISNet' | 'U2NetHumanSeg' | 'BiRefNet' | 'U2Net';

export const modelDefinitions: Record<ModelKey, {
  file: string;
  size: number;
  name: string;
  norm: 'imagenet' | 'isnet';
  outputType: 'sigmoid' | 'direct';
  env?: string;
}> = {
  ISNet: {
    file: 'isnet-general-use.onnx',
    size: 1024,
    name: 'IS-Net DIS5K 1024px (High Precision)',
    norm: 'isnet',
    outputType: 'direct',
    env: process.env.ISNET_MODEL_PATH,
  },
  U2NetHumanSeg: {
    file: 'u2net_human_seg.onnx',
    size: 320,
    name: 'U2Net Human Seg (Portrait AI)',
    norm: 'imagenet',
    outputType: 'direct',
    env: process.env.U2NET_HUMAN_SEG_MODEL_PATH,
  },
  BiRefNet: {
    file: 'birefnet-general-lite.onnx',
    size: 1024,
    name: 'BiRefNet General Lite (ONNX CPU)',
    norm: 'imagenet',
    outputType: 'sigmoid',
    env: process.env.BIREFNET_MODEL_PATH,
  },
  U2Net: {
    file: 'u2net.onnx',
    size: 320,
    name: 'U2Net Standard (ONNX CPU)',
    norm: 'imagenet',
    outputType: 'direct',
    env: process.env.U2NET_MODEL_PATH,
  },
};

const sessions = new Map<ModelKey, Promise<InferenceSession>>();
let tail: Promise<unknown> = Promise.resolve();
let pending = 0;

async function getSession(key: ModelKey): Promise<InferenceSession> {
  const model = modelDefinitions[key];
  const modelPath = model.env || fileURLToPath(new URL('../models/' + model.file, import.meta.url));

  if (!existsSync(modelPath)) {
    // Fallback to BiRefNet or U2Net if model file not yet installed
    if (key !== 'BiRefNet' && existsSync(fileURLToPath(new URL('../models/birefnet-general-lite.onnx', import.meta.url)))) {
      return getSession('BiRefNet');
    }
    if (key !== 'U2Net' && existsSync(fileURLToPath(new URL('../models/u2net.onnx', import.meta.url)))) {
      return getSession('U2Net');
    }
    throw new Error('Model AI ' + key + ' belum terpasang. Jalankan setup model di server.');
  }

  if (!sessions.has(key)) {
    const p = InferenceSession.create(modelPath, {
      executionProviders: ['cpu'],
      intraOpNumThreads: 4,
      interOpNumThreads: 1,
      graphOptimizationLevel: 'all',
    }).catch((e) => {
      sessions.delete(key);
      throw e;
    });
    sessions.set(key, p);
  }
  return sessions.get(key)!;
}

export class NeuralBackgroundRemovalService implements IBackgroundRemovalService {
  private modelKey: ModelKey;
  constructor(modelKey: ModelKey = 'ISNet') {
    this.modelKey = modelKey;
  }

  get name() {
    return modelDefinitions[this.modelKey]?.name || this.modelKey;
  }

  async removeBackground(imageBuffer: Buffer, options: RemovalOptions = {}): Promise<RemovalResult> {
    if (pending >= 6) {
      throw new Error('Antrean AI penuh. Coba lagi setelah proses lain selesai.');
    }
    pending++;

    const run = tail.then(async () => {
      const start = performance.now();
      const config = modelDefinitions[this.modelKey] || modelDefinitions.ISNet;
      const engine = await getSession(this.modelKey);
      const size = config.size;

      const { data: original, info } = await sharp(imageBuffer, { limitInputPixels: 25000000 })
        .rotate()
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const rgb = await sharp(original, { raw: info })
        .removeAlpha()
        .resize(size, size, { fit: 'fill', kernel: 'lanczos3' })
        .raw()
        .toBuffer();

      const input = new Float32Array(3 * size * size);
      if (config.norm === 'isnet') {
        for (let c = 0; c < 3; c++) {
          for (let i = 0; i < size * size; i++) {
            input[c * size * size + i] = (rgb[i * 3 + c] / 255.0 - 0.5) / 1.0;
          }
        }
      } else {
        const mean = [0.485, 0.456, 0.406];
        const std = [0.229, 0.224, 0.225];
        for (let c = 0; c < 3; c++) {
          for (let i = 0; i < size * size; i++) {
            input[c * size * size + i] = (rgb[i * 3 + c] / 255.0 - mean[c]) / std[c];
          }
        }
      }

      const outputs = await engine.run({ [engine.inputNames[0]]: new Tensor('float32', input, [1, 3, size, size]) });
      const rawPrediction = outputs[engine.outputNames[0]].data as Float32Array;

      // Handle output sigmoid if model outputs logits
      const prediction = new Float32Array(size * size);
      if (config.outputType === 'sigmoid') {
        for (let i = 0; i < prediction.length; i++) {
          prediction[i] = 1 / (1 + Math.exp(-rawPrediction[i]));
        }
      } else {
        prediction.set(rawPrediction.subarray(0, size * size));
      }

      // Check min and max
      let low = Infinity;
      let high = -Infinity;
      for (let i = 0; i < size * size; i++) {
        if (prediction[i] < low) low = prediction[i];
        if (prediction[i] > high) high = prediction[i];
      }

      if (!Number.isFinite(low) || high - low < 1e-7) {
        throw new Error('Model tidak dapat memisahkan subjek pada gambar ini.');
      }

      // Determine threshold from options (default 0.5, or user specified 0.1-0.9)
      let th = 0.5;
      if (options.confidenceThreshold !== undefined && options.confidenceThreshold !== null) {
        const c = Number(options.confidenceThreshold);
        th = c > 1 ? c / 100 : c;
        th = Math.max(0.1, Math.min(0.9, th));
      }

      // Refinement curve
      let spread = 0.2;
      if (options.refinementLevel === 'high') spread = 0.15;
      if (options.refinementLevel === 'ultra') spread = 0.08;

      const lowCut = Math.max(0.02, th - spread);
      const highCut = Math.min(0.98, th + spread);

      const mask = Buffer.alloc(size * size);
      for (let i = 0; i < mask.length; i++) {
        const val = (prediction[i] - low) / (high - low);
        if (val <= lowCut) {
          mask[i] = 0;
        } else if (val >= highCut) {
          mask[i] = 255;
        } else {
          const t = (val - lowCut) / (highCut - lowCut);
          // Smoothstep function for anti-aliased clean boundary
          mask[i] = Math.round((3 * t * t - 2 * t * t * t) * 255);
        }
      }

      // Resize mask to original dimensions
      let alphaPipeline = sharp(mask, { raw: { width: size, height: size, channels: 1 } })
        .resize(info.width, info.height, { kernel: 'lanczos3' })
        .greyscale();

      if (options.edgeFeathering && options.edgeFeathering > 0) {
        alphaPipeline = alphaPipeline.blur(options.edgeFeathering);
      }

      const alpha = await alphaPipeline.raw().toBuffer();

      for (let i = 0; i < alpha.length; i++) {
        alpha[i] = Math.round((alpha[i] * original[i * 4 + 3]) / 255);
        original[i * 4 + 3] = alpha[i];
      }

      const resultBuffer = await sharp(original, { raw: info }).png().toBuffer();
      const maskBuffer = await sharp(alpha, { raw: { width: info.width, height: info.height, channels: 1 } }).png().toBuffer();

      return {
        resultBuffer: options.returnMaskOnly ? maskBuffer : resultBuffer,
        maskBuffer,
        executionTimeMs: Math.round(performance.now() - start),
        confidence: Math.round((1 - low) * 100),
        modelUsed: this.name,
      };
    });

    tail = run.catch(() => {});
    try {
      return await run;
    } finally {
      pending--;
    }
  }
}

const engines: Record<ModelKey, NeuralBackgroundRemovalService> = {
  ISNet: new NeuralBackgroundRemovalService('ISNet'),
  U2NetHumanSeg: new NeuralBackgroundRemovalService('U2NetHumanSeg'),
  BiRefNet: new NeuralBackgroundRemovalService('BiRefNet'),
  U2Net: new NeuralBackgroundRemovalService('U2Net'),
};

export function getBackgroundRemovalService(modelName = 'ISNet', _mockMode = false): IBackgroundRemovalService {
  if (modelName.includes('HumanSeg') || modelName.includes('Human') || modelName.includes('Portrait')) {
    return engines.U2NetHumanSeg;
  }
  if (modelName.startsWith('U2Net') && !modelName.includes('Human')) {
    return engines.U2Net;
  }
  if (modelName.includes('BiRefNet')) {
    return engines.BiRefNet;
  }
  return engines.ISNet;
}
