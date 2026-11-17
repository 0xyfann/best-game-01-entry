// main.ts — Tidewarden hand-in program for make.fun's best-game-01.
//
// Round 2 rewrite. The round-1 version opened with rmSync(outDir), which
// tries to remove the output directory itself; in the grader /output is a
// mounted directory owned by root, so that rmdir is refused (EACCES) and
// the run exits 1 before copying anything. This version never removes the
// output directory: it creates it when missing, clears only the entries
// inside it (each one a file this program put there), copies game/ and
// screenshots/ in, and builds the dossier from the output directory, the
// way the kit's starter does.
//
// Node 22, standard library only. Output directory: MAKEFUN_OUTPUT_DIR,
// default "/output".

import {
  cpSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

// The competition's declared caps for buildDossier — do not loosen.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

function clearOutputContents(outDir: string): void {
  // Remove what an earlier run left inside outDir, entry by entry. The
  // directory itself stays: it may be a mount point the process may not
  // remove. A missing directory reads as empty.
  let names: string[];
  try {
    names = readdirSync(outDir);
  } catch {
    return;
  }
  for (const name of names) {
    rmSync(join(outDir, name), { recursive: true, force: true });
  }
}

function main(): void {
  const root = dirname(fileURLToPath(import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

  mkdirSync(outDir, { recursive: true });
  clearOutputContents(outDir);
  console.log(`main.ts: output directory ready: ${outDir}`);

  for (const part of ["game", "screenshots"] as const) {
    cpSync(join(root, part), join(outDir, part), { recursive: true });
    console.log(`main.ts: copied ${part}/ -> ${join(outDir, part)}`);
  }

  const dossier = buildDossier(outDir, CAPS);
  writeFileSync(join(outDir, "dossier.json"), dossier);
  console.log(`main.ts: dossier.json written (${dossier.length} bytes)`);
}

main();
