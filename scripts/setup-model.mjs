import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const dir = new URL('../packages/services/models/', import.meta.url);
await mkdir(dir, {recursive:true});
const target = new URL('u2net.onnx',dir);
const hash = b => createHash('md5').update(b).digest('hex');
const expected = '60024c5c889badc19c04ad937298a77b';
try { if(hash(await readFile(target))===expected) { console.log('U2Net model verified and ready'); process.exit(0); } } catch {}
console.log('Downloading official U2Net trained weights (176 MB)...');
const response = await fetch('https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx');
if(!response.ok) throw Error('Model download failed: '+response.status);
const bytes=Buffer.from(await response.arrayBuffer());
if(hash(bytes)!==expected) throw Error('Model checksum mismatch; download rejected');
const partial=new URL('u2net.onnx.partial',dir);
await writeFile(partial,bytes);await rename(partial,target);
console.log('U2Net model downloaded and checksum verified: '+bytes.length+' bytes');
