import { access, copyFile, readdir, rename, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const release = resolve(fileURLToPath(new URL('../release/', import.meta.url)));
const packed = resolve(fileURLToPath(new URL('../.pack/', import.meta.url)));
const output = join(release, 'LOD_SURVIVAL.exe');
const next = join(packed, '.next.exe');

if (process.argv[2] !== '--cleanup-only') {
  await copyFile(join(packed, 'LOD_SURVIVAL.exe'), next);
  await rename(next, output);
}
await access(output);

for (const entry of await readdir(release)) {
  if (entry === 'LOD_SURVIVAL.exe') continue;
  const target = join(release, entry);
  if (dirname(target) !== release) throw new Error(`Unsafe release path: ${target}`);
  await rm(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
}
await rm(packed, { recursive: true, force: true, maxRetries: 60, retryDelay: 500 });
console.log(`Published ${output}`);
