// waves.js — the 10 wave compositions and the spawn director for Tidewarden.
// Each wave is a list of {kind, count} groups; the director trickles spawns in
// from the dark edge of the arena so a wave feels like a tide, not a teleport.

import { ARENA } from './config.js';
import { makeEnemy } from './entities.js';

export const WAVES = [
  { groups: [{ kind: 'drifter', count: 6 }] },
  { groups: [{ kind: 'drifter', count: 7 }, { kind: 'skitter', count: 3 }] },
  { groups: [{ kind: 'drifter', count: 8 }, { kind: 'skitter', count: 5 }, { kind: 'spitter', count: 1 }] },
  { groups: [{ kind: 'drifter', count: 8 }, { kind: 'skitter', count: 7 }, { kind: 'brute', count: 1 }, { kind: 'spitter', count: 1 }] },
  { groups: [{ kind: 'drifter', count: 10 }, { kind: 'skitter', count: 8 }, { kind: 'spitter', count: 2 }, { kind: 'brute', count: 1 }] },
  { groups: [{ kind: 'skitter', count: 12 }, { kind: 'drifter', count: 10 }, { kind: 'spitter', count: 2 }, { kind: 'brute', count: 2 }] },
  { groups: [{ kind: 'drifter', count: 12 }, { kind: 'skitter', count: 10 }, { kind: 'spitter', count: 3 }, { kind: 'brute', count: 2 }] },
  { groups: [{ kind: 'skitter', count: 14 }, { kind: 'spitter', count: 3 }, { kind: 'brute', count: 3 }, { kind: 'drifter', count: 10 }] },
  { groups: [{ kind: 'drifter', count: 14 }, { kind: 'skitter', count: 12 }, { kind: 'spitter', count: 4 }, { kind: 'brute', count: 3 }] },
  { groups: [{ kind: 'drifter', count: 16 }, { kind: 'skitter', count: 14 }, { kind: 'spitter', count: 4 }, { kind: 'brute', count: 4 }] },
];

export function waveTotal(wave) {
  return wave.groups.reduce((sum, g) => sum + g.count, 0);
}

export class SpawnDirector {
  constructor(rng) {
    this.rng = rng;
    this.queue = [];       // kinds still waiting to spawn, shuffled
    this.timer = 0;
    this.interval = 0.9;   // seconds between spawns; shrinks in later waves
    this.waveIndex = 0;
  }

  startWave(index) {
    this.waveIndex = index;
    const wave = WAVES[index];
    this.queue = [];
    for (const g of wave.groups) for (let i = 0; i < g.count; i++) this.queue.push(g.kind);
    // Fisher–Yates shuffle with the game RNG so composition mixes at the shore.
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.float() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
    this.interval = Math.max(0.32, 0.95 - index * 0.07);
    this.timer = 0.4;
  }

  get pending() { return this.queue.length; }

  // Returns an enemy to add, or null. Spawns just outside the arena rim.
  update(dt, world) {
    if (!this.queue.length) return null;
    this.timer -= dt;
    if (this.timer > 0) return null;
    this.timer = this.interval * this.rng.range(0.7, 1.3);
    const kind = this.queue.pop();
    const a = this.rng.angle();
    const r = ARENA.radius + 46;
    const x = ARENA.cx + Math.cos(a) * r;
    const y = ARENA.cy + Math.sin(a) * r;
    const e = makeEnemy(kind, x, y, this.rng);
    world.onEnemySpawned?.(e);
    return e;
  }
}
