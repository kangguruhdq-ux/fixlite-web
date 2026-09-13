import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const dir = new URL('../packages/services/models/', import.meta.url);
const target = new URL('u2net_human_seg.onnx', dir);
console.log('Downloading u2net_human_seg.onnx (176 MB)...');
const res = await fetch('https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_human_seg.onnx');
if (!res.ok) throw Error('Download failed: ' + res.status);
const bytes = Buffer.from(await res.arrayBuffer());
const partial = new URL('u2net_human_seg.onnx.partial', dir);
await writeFile(partial, bytes);
await rename(partial, target);
console.log('Downloaded u2net_human_seg.onnx: ' + bytes.length + ' bytes');
