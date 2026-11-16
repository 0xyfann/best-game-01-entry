// rng.js — small seeded RNG (mulberry32) so screenshot scenes and spawns are reproducible.

export function mulberry32(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed = 1) { this.next = mulberry32(seed); this.seed = seed; }
  float() { return this.next(); }
  range(lo, hi) { return lo + (hi - lo) * this.next(); }
  int(lo, hi) { return lo + Math.floor(this.next() * (hi - lo + 1)); } // inclusive
  pick(arr) { return arr[Math.floor(this.next() * arr.length) % arr.length]; }
  chance(p) { return this.next() < p; }
  angle() { return this.next() * Math.PI * 2; }
}

// Live gameplay uses a time-seeded instance; shot scenes pass an explicit seed instead.
export function liveRng() { return new Rng((Date.now() ^ 0x9e3779b9) >>> 0); }
