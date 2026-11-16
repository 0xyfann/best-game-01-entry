// shots.js — deterministic screenshot scenes for Tidewarden.
// When the URL carries ?shot=<scene>&seed=<n>, main.js calls buildShotScene()
// instead of starting live play: the scene is simulated with a seeded RNG for a
// fixed number of steps (no wall clock, no stored best score), rendered once by
// the caller, and flagged ready via window.__shotReady.

import { Rng } from './rng.js';
import { World, PHASE } from './world.js';
import { makeEnemy, makePickup } from './entities.js';
import { ARENA, FIXED_STEP } from './config.js';

class FakeAudio {
  waveStart() {} shoot() {} hit() {} enemyDeath() {} playerHurt() {} coreHit() {}
  dash() {} pickup() {} victory() {} defeat() {}
}

class ScriptedInput {
  constructor(mouseX, mouseY, firing) {
    this.mouseX = mouseX; this.mouseY = mouseY;
    this._firing = firing;
    this.dashPressed = false; this.pausePressed = false; this.confirmPressed = false; this.mutePressed = false;
  }
  moveVector() { return { x: 0.35, y: -0.2 }; }
  get firing() { return this._firing; }
  endFrame() {}
}

function place(world, kind, x, y, hpFrac = 1) {
  const e = makeEnemy(kind, x, y, world.rng);
  e.hp = Math.round(e.maxHp * hpFrac);
  world.enemies.push(e);
  return e;
}

function runSteps(world, input, steps) {
  for (let i = 0; i < steps; i++) world.step(FIXED_STEP, input);
}

export function buildShotScene(scene, seed) {
  const rng = new Rng(seed || 7);
  const world = new World(rng, new FakeAudio(), { persistBest: false });
  const idle = new ScriptedInput(ARENA.cx + 120, ARENA.cy - 60, false);

  if (scene === 'title') {
    // Skip the banner, clear the spawn queue, leave a few drifters wandering
    // so the arena behind the title panel is visibly alive.
    world.phase = PHASE.COMBAT;
    world.director.queue.length = 0;
    place(world, 'drifter', ARENA.cx - 170, ARENA.cy - 90);
    place(world, 'drifter', ARENA.cx + 150, ARENA.cy + 110);
    place(world, 'drifter', ARENA.cx + 40, ARENA.cy - 190);
    place(world, 'skitter', ARENA.cx - 90, ARENA.cy + 170);
    runSteps(world, idle, 90);
    return { world, screen: 'title' };
  }

  if (scene === 'play') {
    // Mid wave-4 action: fast-forward into a populated fight, player firing.
    world.waveIndex = 3;
    world.phase = PHASE.COMBAT;
    world.director.queue.length = 0;
    world.score = 4350; world.best = 6200; world.kills = 41;
    world.combo = 3.5; world.comboTimer = 2;
    world.time = 148;
    world.player.x = ARENA.cx - 90; world.player.y = ARENA.cy + 70;
    world.player.hp = 68; world.core.hp = 164;
    world.player.starfireTimer = 6;
    world.player.shotsFired = 210; world.player.shotsHit = 158;
    place(world, 'drifter', ARENA.cx + 130, ARENA.cy - 40, 0.6);
    place(world, 'drifter', ARENA.cx - 210, ARENA.cy - 120);
    place(world, 'skitter', ARENA.cx + 60, ARENA.cy + 150, 0.5);
    place(world, 'skitter', ARENA.cx - 40, ARENA.cy - 200);
    place(world, 'brute', ARENA.cx + 200, ARENA.cy + 60, 0.75);
    place(world, 'spitter', ARENA.cx - 230, ARENA.cy + 40);
    world.pickups.push(makePickup('starfire', ARENA.cx + 30, ARENA.cy + 120));
    const firing = new ScriptedInput(ARENA.cx + 130, ARENA.cy - 40, true);
    runSteps(world, firing, 46);
    // Guarantee visible particles for the still frame.
    world.particles.gloomPuff(world.rng, ARENA.cx + 90, ARENA.cy + 100, false);
    world.particles.burst(world.rng, ARENA.cx - 150, ARENA.cy - 60, 10, '#ffe9a8', 170, 0.6, 3);
    return { world, screen: 'play' };
  }

  if (scene === 'victory') {
    world.phase = PHASE.DONE;
    world.outcome = 'victory';
    world.score = 18750; world.best = 18750; world.kills = 186;
    world.time = 512; world.waveIndex = 9;
    world.player.shotsFired = 940; world.player.shotsHit = 701;
    world.core.hp = 96; world.player.hp = 54;
    world.director.queue.length = 0;
    runSteps(world, idle, 2);
    return { world, screen: 'victory' };
  }

  // gameover (default): core destroyed, wreckage smoke still rising.
  world.phase = PHASE.DONE;
  world.outcome = 'defeat';
  world.outcomeReason = 'The Heartlight was extinguished.';
  world.score = 9240; world.best = 12100; world.kills = 97;
  world.time = 301; world.waveIndex = 6;
  world.player.shotsFired = 520; world.player.shotsHit = 348;
  world.core.hp = 0; world.core.alive = false; world.player.hp = 23;
  world.director.queue.length = 0;
  place(world, 'drifter', ARENA.cx + 90, ARENA.cy - 60);
  place(world, 'brute', ARENA.cx - 150, ARENA.cy + 90, 0.8);
  for (let i = 0; i < 22; i++) world.particles.smoke(world.rng, world.core.x, world.core.y);
  runSteps(world, idle, 2);
  return { world, screen: 'gameover' };
}
