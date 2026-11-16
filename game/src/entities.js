// entities.js — factories and per-kind behaviour data for Tidewarden entities.
// Entities are plain objects; world.js owns the arrays and the update order.
// This file knows how each enemy moves and what each pickup does, nothing about score.

import { ENEMY_KINDS, PLAYER, CORE, ARENA } from './config.js';

export function makePlayer() {
  return {
    x: ARENA.cx, y: ARENA.cy + 120, vx: 0, vy: 0, radius: PLAYER.radius,
    hp: PLAYER.hp, maxHp: PLAYER.hp, aim: -Math.PI / 2,
    fireTimer: 0, dashTimer: 0, dashCooldown: 0, invulnTimer: 0,
    hurtTimer: 0, contactTimer: 0, shieldTimer: 0, starfireTimer: 0, surgeTimer: 0,
    shotsFired: 0, shotsHit: 0, alive: true, walkPhase: 0,
  };
}

export function makeCore() {
  return { x: ARENA.cx, y: ARENA.cy, radius: CORE.radius, hp: CORE.hp, maxHp: CORE.hp, pulse: 0, hurtTimer: 0, alive: true };
}

let enemySeq = 1;
export function makeEnemy(kind, x, y, rng) {
  const base = ENEMY_KINDS[kind];
  return {
    id: enemySeq++, kind, x, y, vx: 0, vy: 0,
    radius: base.radius, hp: base.hp, maxHp: base.hp,
    speed: base.speed * rng.range(0.88, 1.12),
    flash: 0, wobble: rng.angle(), wobbleSpeed: rng.range(2, 5),
    fireTimer: rng.range(0.8, ENEMY_KINDS.spitter.fireInterval),
    strafeDir: rng.chance(0.5) ? 1 : -1, touchTimer: 0, dead: false,
  };
}

export function makeBullet(x, y, angle, friendly) {
  return {
    x, y, vx: Math.cos(angle) * (friendly ? PLAYER.bulletSpeed : ENEMY_KINDS.spitter.boltSpeed),
    vy: Math.sin(angle) * (friendly ? PLAYER.bulletSpeed : ENEMY_KINDS.spitter.boltSpeed),
    radius: friendly ? PLAYER.bulletRadius : 5,
    damage: friendly ? PLAYER.bulletDamage : ENEMY_KINDS.spitter.boltDamage,
    friendly, alive: true, life: 1.4,
  };
}

export const PICKUP_KINDS = ['repair', 'starfire', 'aegis', 'surge'];
export function makePickup(kind, x, y) {
  return { kind, x, y, radius: 11, life: 11, bob: Math.random() * Math.PI * 2, alive: true };
}

// --- Enemy steering -------------------------------------------------------
// Returns a desired velocity; world.js integrates and resolves collisions.
export function steerEnemy(e, world, dt) {
  const p = world.player; const c = world.core;
  // Target selection: most enemies hunt the player, but drift toward the core
  // when the player is far away — this keeps pressure on both HP bars.
  const dPlayer = Math.hypot(p.x - e.x, p.y - e.y);
  const target = (e.kind === 'drifter' && dPlayer > 300) || !p.alive ? c : p;
  const dx = target.x - e.x, dy = target.y - e.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / dist, uy = dy / dist;
  e.wobble += dt * e.wobbleSpeed;

  if (e.kind === 'skitter') {
    const zig = Math.sin(e.wobble * 2.2) * 0.85;
    const px = -uy * zig, py = ux * zig;
    return { vx: (ux + px) * e.speed, vy: (uy + py) * e.speed };
  }
  if (e.kind === 'spitter') {
    const want = ENEMY_KINDS.spitter.keepDistance;
    let radial = 0;
    if (dist < want - 30) radial = -1; else if (dist > want + 40) radial = 1;
    const orbit = 0.45 * e.strafeDir;
    return { vx: (ux * radial + -uy * orbit) * e.speed, vy: (uy * radial + ux * orbit) * e.speed };
  }
  if (e.kind === 'brute') {
    // Brutes ignore the player and march on the core unless the player is very close.
    const bc = { x: c.x - e.x, y: c.y - e.y };
    const bd = Math.max(1, Math.hypot(bc.x, bc.y));
    const huntPlayer = p.alive && dPlayer < 110;
    const tx = huntPlayer ? ux : bc.x / bd, ty = huntPlayer ? uy : bc.y / bd;
    return { vx: tx * e.speed, vy: ty * e.speed };
  }
  // drifter: steady chase with a gentle sine sway
  const sway = Math.sin(e.wobble) * 0.25;
  return { vx: (ux + -uy * sway) * e.speed, vy: (uy + ux * sway) * e.speed };
}

// Which pickup (if any) a kill drops; brutes are generous, others are stingy.
export function rollDrop(rng, kind, cfg) {
  const chance = kind === 'brute' ? cfg.bruteDropChance : cfg.dropChance;
  if (!rng.chance(chance)) return null;
  return rng.pick(PICKUP_KINDS);
}
