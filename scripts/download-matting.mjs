import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';

const dir = new URL('../packages/services/models/', import.meta.url);
const target = new URL('u2net-portrait-matting.onnx', dir);
console.log('Downloading u2net-portrait-matting.onnx (176 MB)...');
const res = await fetch('https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net-portrait-matting.onnx');
if (!res.ok) throw Error('Download failed: ' + res.status);
const bytes = Buffer.from(await res.arrayBuffer());
const partial = new URL('u2net-portrait-matting.onnx.partial', dir);
await writeFile(partial, bytes);
await rename(partial, target);
console.log('Downloaded u2net-portrait-matting.onnx: ' + bytes.length + ' bytes');
