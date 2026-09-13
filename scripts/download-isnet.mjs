import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';

const dir = new URL('../packages/services/models/', import.meta.url);
const target = new URL('isnet-general-use.onnx', dir);
console.log('Downloading isnet-general-use.onnx (178 MB)...');
const res = await fetch('https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx');
if (!res.ok) throw Error('Download failed: ' + res.status);
const bytes = Buffer.from(await res.arrayBuffer());
const partial = new URL('isnet-general-use.onnx.partial', dir);
await writeFile(partial, bytes);
await rename(partial, target);
console.log('Downloaded isnet-general-use.onnx: ' + bytes.length + ' bytes');
