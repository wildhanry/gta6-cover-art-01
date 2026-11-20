// Vice Panels — entry program for make.fun's "Make GTA 6 Cover Art" (gta6-cover-art-01).
//
// What this program does, and all it does: it publishes the finished web app.
// The app itself is the static file tree under app/ (open app/index.html in a desktop
// browser; it runs fully offline and never uploads a photo). This program copies
// app/ and screenshots/ from the repository into the output directory and writes
// the judge's dossier there with buildDossier from vendor/makefun-app.ts, the kit's
// library, byte-identical to the scorer's own copy.
//
// Runtime contract (from the competition rules): Node 22, standard library only,
// no network, a read-only repository and a writable output, 10 seconds on 1 CPU.
// The copy below is deliberately boring — plain recursive copies in sorted order —
// so two runs in a row write exactly the same bytes.
//
// Local run:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader the output directory is /output and MAKEFUN_OUTPUT_DIR is unset.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

/** The gate's caps, copied from the kit's reference/gate.json values for this bounty. */
const GATE_CAPS = {
  text_max_bytes: 163_840,
  screenshots: { max: 4, max_bytes: 262_144 },
  app_max_files: 993,
  app_max_bytes: 50_331_648,
  app_path_max_bytes: 1_000,
} as const;

/** Copies one directory tree into the output, creating the destination first. */
function publishTree(repoRoot: string, outRoot: string, name: string): void {
  const source = join(repoRoot, name);
  const target = join(outRoot, name);
  mkdirSync(target, { recursive: true });
  if (existsSync(source)) {
    cpSync(source, target, { recursive: true });
  }
}

/** Counts the files a published tree holds, for the one-line run report. */
function countFiles(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    total += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return total;
}

const startedAt = Date.now();
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
publishTree(repoRoot, outputDir, 'app');
publishTree(repoRoot, outputDir, 'screenshots');

const dossierBytes = buildDossier(outputDir, { ...GATE_CAPS });
writeFileSync(join(outputDir, 'dossier.json'), dossierBytes);

const appFiles = countFiles(join(outputDir, 'app'));
const shotFiles = countFiles(join(outputDir, 'screenshots'));
console.log(`vice-panels: published ${appFiles} app files and ${shotFiles} screenshots; dossier ${dossierBytes.length} bytes in ${Date.now() - startedAt} ms`);
