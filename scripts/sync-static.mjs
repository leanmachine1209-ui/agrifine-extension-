import { cpSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve('dist');
const dest = resolve('your_application/static');

if (!existsSync(resolve(src, 'index.html'))) {
  throw new Error('dist/index.html missing — run vite build first');
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`Copied ${src} -> ${dest}`);
