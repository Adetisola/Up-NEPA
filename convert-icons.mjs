import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const icon192 = fs.readFileSync(path.resolve('public/icons/icon-192.svg'));
const icon512 = fs.readFileSync(path.resolve('public/icons/icon-512.svg'));

async function convert() {
  await sharp(icon192)
    .resize(192, 192)
    .png()
    .toFile(path.resolve('public/icons/icon-192.png'));
    
  await sharp(icon512)
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/icons/icon-512.png'));
    
  console.log('Icons converted successfully.');
}

convert().catch(console.error);
