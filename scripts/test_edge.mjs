import sharp from 'sharp';
import fs from 'node:fs';

async function testEdgeCleanup() {
  const buf = fs.readFileSync('artifacts/ai-review/birefnet-portrait.png');
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  
  // Let's test smart despill & edge choke
  // In demo-portrait.jpg, the background wall is lavender/purple: R~147, G~152, B~220 (or shadow R~107, G~82, B~88).
  // If the user wants to erase that shadow, in the editor they can use the Eraser brush!
  console.log('Original width:', info.width, 'height:', info.height);
}
testEdgeCleanup().catch(console.error);
