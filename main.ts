// Leonida Cover Forge — the entrypoint the grader runs (Node 22, standard library only).
//
// The app itself is the static files in app/ beside this file: an offline cover maker
// (index.html plus its modules) that a desktop browser loads with no network at all.
// This program hands it in: it stages app/ and screenshots/ into the output
// directory and writes dossier.json, the summary the judge reads, with the vendored
// make.fun library.
//
// One rule shapes everything below. The grader runs this program as an unprivileged
// user (uid 65534) with the repository mounted read-only and the output directory
// mounted by root. That user may write *inside* the output directory, but it may
// not delete the output directory itself: removing it needs write permission on its
// parent, which it does not have, so any attempt exits with EPERM and fails the run.
// This program therefore never removes the output directory. It creates it if it is
// missing, empties only what is already inside it, and then copies the app in.
//
// Run it locally with:  MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Create the output directory (a no-op when it already exists) and empty only its
// contents, one entry at a time. The directory itself is never removed: see above.
mkdirSync(out, { recursive: true });
for (const entry of readdirSync(out, { withFileTypes: true })) {
  rmSync(join(out, entry.name), { recursive: true, force: true });
}

cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes;
// the others refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in app/ or 48 MiB of app files, in all, or a path
// under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// A short, fixed summary for the run log: no timestamps and no randomness, so
// two runs of this program print the same lines.
console.log(`Leonida Cover Forge: app/ and screenshots/ staged into ${out}`);
console.log('Leonida Cover Forge: dossier.json written');
