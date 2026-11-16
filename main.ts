// main.ts — Tidewarden entry hand-in program for the make.fun best-game-01 kit.
//
// What it does, in order:
//   1. Resolve the entry root from this file's URL and the output directory
//      from MAKEFUN_OUTPUT_DIR (default "/output").
//   2. Recreate the output directory and copy game/ and screenshots/ into it.
//   3. Build the competition dossier from the entry root with the vendored
//      library, under the exact capability caps the competition declares,
//      and write it as dossier.json in the output directory.
// Node 22, standard library only (the vendored library is stdlib-only too).

import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

// Capability caps from the competition rules — do not loosen these.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

function main(): void {
  const root = dirname(fileURLToPath(import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  console.log(`main.ts: output directory ready: ${outDir}`);

  for (const part of ["game", "screenshots"] as const) {
    cpSync(join(root, part), join(outDir, part), { recursive: true });
    console.log(`main.ts: copied ${part}/ -> ${join(outDir, part)}`);
  }

  const dossier = buildDossier(root, CAPS);
  writeFileSync(join(outDir, "dossier.json"), dossier);
  console.log(`main.ts: dossier.json written (${dossier.length} bytes)`);
}

main();
