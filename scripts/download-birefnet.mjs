import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';import {createHash} from 'node:crypto';
const dir=new URL('../packages/services/models/',import.meta.url);await mkdir(dir,{recursive:true});
const model='birefnet-general-lite.onnx',expected='4fab47adc4ff364be1713e97b7e66334',target=new URL(model,dir),hash=b=>createHash('md5').update(b).digest('hex');
try{if(hash(await readFile(target))===expected){console.log('BiRefNet verified');process.exit(0);}}catch{}
console.log('Downloading trained BiRefNet General Lite (1024 px)...');
const res=await fetch('https://github.com/danielgatis/rembg/releases/download/v0.0.0/BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx');
if(!res.ok)throw Error('Download failed '+res.status);
const bytes=Buffer.from(await res.arrayBuffer());if(hash(bytes)!==expected)throw Error('Checksum mismatch');
const partial=new URL(model+'.partial',dir);await writeFile(partial,bytes);await rename(partial,target);
console.log('BiRefNet ready; checksum verified; '+bytes.length+' bytes');
