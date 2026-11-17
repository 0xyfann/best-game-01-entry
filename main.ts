// Tidewarden hand-in program for the best-game-01 competition.
//
// Why this version exists: in the grading sandbox the output location is
// not an ordinary folder owned by the process. It is a bind-mounted
// directory owned by root, while this program runs as an unprivileged
// user. Removing that directory itself is therefore refused, even though
// writing inside it works fine. So the strategy below is deliberately
// conservative: make sure the directory is present, empty it by deleting
// each entry it contains in turn, and never attempt to delete, rename or
// replace the directory itself. That keeps repeat runs working both in
// the sandbox and in a plain local checkout.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

// The repository root is the folder that holds this file, wherever the
// repository happens to be mounted or checked out.
const entryRoot = fileURLToPath(new URL(".", import.meta.url));

// Graders set MAKEFUN_OUTPUT_DIR; the documented fallback is /output.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

console.log(`Tidewarden: handing in the game from ${entryRoot}`);
console.log(`Tidewarden: output directory is ${outputDir}`);

// Step 1: ensure the destination exists without disturbing the
// destination itself. A recursive mkdir is a no-op when it is already
// there, which is exactly the behaviour a mount point needs.
mkdirSync(outputDir, { recursive: true });

// Step 2: drop any artefacts left by an earlier run. Each child of the
// output directory is removed individually; the directory stays put.
for (const childName of readdirSync(outputDir)) {
  const childPath = join(outputDir, childName);
  console.log(`Tidewarden: clearing previous output entry ${childName}`);
  rmSync(childPath, { recursive: true, force: true });
}

// Step 3: copy the playable game and its screenshots across. Both are
// plain directory trees, so a recursive copy is sufficient and no
// intermediate archive or build step is involved.
const gameSource = join(entryRoot, "game");
const gameTarget = join(outputDir, "game");
cpSync(gameSource, gameTarget, { recursive: true });
console.log("Tidewarden: game/ copied");

const shotsSource = join(entryRoot, "screenshots");
if (existsSync(shotsSource)) {
  const shotsTarget = join(outputDir, "screenshots");
  mkdirSync(shotsTarget, { recursive: true });
  cpSync(shotsSource, shotsTarget, { recursive: true });
  console.log("Tidewarden: screenshots/ copied");
} else {
  console.log("Tidewarden: no screenshots/ folder present, skipping it");
}

// Step 4: summarise what now sits in the output directory. The dossier
// must describe the handed-in copy, so buildDossier is pointed at the
// output directory rather than at the source checkout, and it is given
// the scorer's limits exactly as specified for this competition.
const dossierBytes = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

// Step 5: persist the dossier alongside the copied trees.
const dossierPath = join(outputDir, "dossier.json");
writeFileSync(dossierPath, dossierBytes);
console.log(`Tidewarden: dossier written to ${dossierPath}`);
console.log("Tidewarden: hand-in complete");
