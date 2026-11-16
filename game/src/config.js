// config.js — Tidewarden tuning constants: arena, player, core, enemies, pickups.
// Every balance number lives here so gameplay code never hard-codes a magic value.

export const VIEW = { width: 1280, height: 720 };

export const ARENA = {
  cx: 640, cy: 360, radius: 300,
  shoreWidth: 26,
};

export const PLAYER = {
  radius: 14,
  speed: 235,            // px per second
  hp: 100,
  fireRate: 7.5,         // bolts per second while firing
  bulletSpeed: 560,
  bulletDamage: 10,
  bulletRadius: 4,
  dashSpeed: 640,
  dashTime: 0.16,        // seconds of dash burst
  dashCooldown: 1.6,     // seconds
  dashInvuln: 0.28,      // seconds of invulnerability after dash starts
  contactDamageCooldown: 0.55,
};

export const CORE = {
  radius: 30,
  hp: 220,
  pulseSpeed: 2.2,
};

export const COMBO = {
  window: 2.6,           // seconds to keep the chain alive
  maxMultiplier: 8,
  decayPerSecond: 0.55,  // multiplier points lost per second without a kill
};

export const ENEMY_KINDS = {
  drifter: { radius: 15, hp: 30, speed: 62, damage: 10, coreDamage: 8, score: 50, contactRangePad: 2 },
  skitter: { radius: 10, hp: 14, speed: 138, damage: 6, coreDamage: 5, score: 70, contactRangePad: 2 },
  brute:   { radius: 26, hp: 130, speed: 34, damage: 20, coreDamage: 22, score: 200, contactRangePad: 3 },
  spitter: { radius: 14, hp: 36, speed: 52, damage: 8, coreDamage: 6, score: 120, contactRangePad: 2,
             keepDistance: 210, fireInterval: 2.3, boltSpeed: 230, boltDamage: 9 },
};

export const PICKUPS = {
  radius: 11,
  lifetime: 11,          // seconds before a pickup fades
  dropChance: 0.16,      // base chance on any kill
  bruteDropChance: 0.55,
  repairAmount: 34,      // core HP restored by Repair
  starfireTime: 12,      // seconds of 3-way spread
  aegisTime: 10,         // seconds of player shield
  surgeSpeedBonus: 55,   // extra player speed while Surge is active
  surgeTime: 8,
};

export const FIXED_STEP = 1 / 60;
export const MAX_FRAME = 0.25; // clamp huge tab-switch deltas

// Day-to-dusk palette stops, indexed by wave progress 0..1 (world.js interpolates).
export const SKY_STOPS = [
  { t: 0.0, top: '#1b3a5c', mid: '#27567d', glow: '#ffd98a' },
  { t: 0.45, top: '#233457', mid: '#3a4a7d', glow: '#ffb37a' },
  { t: 1.0, top: '#171233', mid: '#2c1f4d', glow: '#ff8a7a' },
];

export const STORAGE_KEY = 'tidewarden.bestScore.v1';
