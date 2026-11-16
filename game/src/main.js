// main.js — Tidewarden boot and screen-flow state machine.
// States: 'title' -> 'playing' <-> 'paused' -> 'victory' | 'gameover' -> 'playing'.
// The simulation runs on a fixed 60 Hz accumulator; rendering happens once per
// animation frame. Shot mode (?shot=...) renders exactly one deterministic frame.

import { VIEW, FIXED_STEP, MAX_FRAME } from './config.js';
import { liveRng } from './rng.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { World } from './world.js';
import { drawWorld } from './render.js';
import { drawTitle, drawPause, drawVictory, drawGameOver } from './screens.js';
import { buildShotScene } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const params = new URLSearchParams(location.search);
const shotScene = params.get('shot');

if (shotScene) {
  const seed = Number(params.get('seed')) || 7;
  const { world, screen } = buildShotScene(shotScene, seed);
  drawWorld(ctx, world, 1.25);
  if (screen === 'title') drawTitle(ctx, 6200);
  else if (screen === 'victory') drawVictory(ctx, world.stats());
  else if (screen === 'gameover') drawGameOver(ctx, world.stats(), world.outcomeReason);
  window.__shotReady = true;
} else {
  startLive();
}

function startLive() {
  const audio = new AudioEngine();
  const input = new Input(canvas);
  input.attach();

  let state = 'title';
  let world = new World(liveRng(), audio);
  let accumulator = 0;
  let lastTs = performance.now();
  let elapsed = 0;

  function newRun() {
    world = new World(liveRng(), audio);
    state = 'playing';
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    let dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (dt > MAX_FRAME) dt = MAX_FRAME;
    elapsed += dt;

    // Global keys work in every state.
    if (input.mutePressed) audio.toggleMute();
    if (input.confirmPressed) audio.unlock();

    if (state === 'title') {
      // The title world idles: enemies wander behind the panel, nobody dies.
      world.particles.update(dt);
      if (input.confirmPressed) newRun();
    } else if (state === 'playing') {
      if (input.pausePressed) { state = 'paused'; world.paused = true; }
      accumulator += dt;
      while (accumulator >= FIXED_STEP) {
        world.step(FIXED_STEP, input);
        accumulator -= FIXED_STEP;
      }
      for (const ev of world.events.splice(0)) {
        if (ev.type === 'victory') state = 'victory';
        if (ev.type === 'defeat') state = 'gameover';
      }
    } else if (state === 'paused') {
      if (input.pausePressed) { state = 'playing'; world.paused = false; }
    } else if (state === 'victory' || state === 'gameover') {
      world.particles.update(dt);
      if (input.confirmPressed) newRun();
    }
    input.endFrame();

    drawWorld(ctx, world, elapsed);
    if (state === 'title') drawTitle(ctx, world.best);
    else if (state === 'paused') drawPause(ctx);
    else if (state === 'victory') drawVictory(ctx, world.stats());
    else if (state === 'gameover') drawGameOver(ctx, world.stats(), world.outcomeReason);
  }
  requestAnimationFrame(frame);

  // Audio may only start after a user gesture.
  const unlock = () => audio.unlock();
  window.addEventListener('keydown', unlock);
  window.addEventListener('mousedown', unlock);
}
