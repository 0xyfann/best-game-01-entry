// world.js — Tidewarden game state and the fixed-step simulation.
// Owns the player, core, enemies, bullets, pickups, particles, score/combo,
// wave flow, screen shake and the win/lose verdict. Rendering lives in render.js;
// this file never touches the canvas, which keeps shot scenes deterministic.

import { ARENA, PLAYER, CORE, COMBO, PICKUPS, ENEMY_KINDS, STORAGE_KEY } from './config.js';
import { makePlayer, makeCore, makeBullet, makePickup, makeEnemy, steerEnemy, rollDrop } from './entities.js';
import { WAVES, waveTotal, SpawnDirector } from './waves.js';
import { ParticlePool } from './particles.js';

export const PHASE = { BANNER: 'banner', COMBAT: 'combat', DONE: 'done' };

export class World {
  constructor(rng, audio, opts = {}) {
    this.rng = rng;
    this.audio = audio;
    this.persistBest = opts.persistBest !== false;
    this.player = makePlayer();
    this.core = makeCore();
    this.enemies = [];
    this.bullets = [];       // pooled below in practice: array with swap-remove
    this.pickups = [];
    this.particles = new ParticlePool();
    this.floaters = [];      // floating score text {x,y,vy,life,text,color}
    this.director = new SpawnDirector(rng);
    this.phase = PHASE.BANNER;
    this.waveIndex = 0;
    this.bannerTimer = 2.2;
    this.time = 0;
    this.score = 0;
    this.best = this.loadBest();
    this.combo = 1;
    this.comboTimer = 0;
    this.kills = 0;
    this.enemiesLeftToSpawn = 0;
    this.waveKillsStart = 0;
    this.shake = 0;
    this.outcome = null;     // 'victory' | 'defeat' once decided
    this.outcomeReason = '';
    this.paused = false;
    this.events = [];        // drained by main.js for screen-flow side effects
    this.beginWave(0, true);
  }

  loadBest() {
    if (!this.persistBest) return 0;
    try { return Number(localStorage.getItem(STORAGE_KEY)) || 0; } catch { return 0; }
  }

  saveBest() {
    if (!this.persistBest) return;
    if (this.score > this.best) {
      this.best = this.score;
      try { localStorage.setItem(STORAGE_KEY, String(this.best)); } catch { /* private mode */ }
    }
  }

  beginWave(index, first = false) {
    this.waveIndex = index;
    this.director.startWave(index);
    this.enemiesLeftToSpawn = waveTotal(WAVES[index]);
    this.phase = PHASE.BANNER;
    this.bannerTimer = first ? 2.4 : 2.0;
    this.events.push({ type: 'wave', index });
    if (!first) this.audio?.waveStart();
  }

  get waveNumber() { return this.waveIndex + 1; }
  get remaining() { return this.director.pending + this.enemies.length; }
  get accuracy() {
    const p = this.player;
    return p.shotsFired > 0 ? Math.round((p.shotsHit / p.shotsFired) * 100) : 100;
  }
  stats() {
    return { score: this.score, best: this.best, time: this.time, kills: this.kills, accuracy: this.accuracy, wave: this.waveNumber };
  }

  onEnemySpawned() { /* hook kept for future telegraph effects */ }

  // --- fixed-step update ---------------------------------------------------
  step(dt, input) {
    if (this.paused || this.phase === PHASE.DONE) { this.particles.update(dt); return; }
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 26);
    this.particles.update(dt);
    this.updateFloaters(dt);
    this.core.pulse += dt * CORE.pulseSpeed;
    if (this.core.hurtTimer > 0) this.core.hurtTimer -= dt;

    if (this.phase === PHASE.BANNER) {
      this.bannerTimer -= dt;
      this.updatePlayer(dt, input, false);
      if (this.bannerTimer <= 0) this.phase = PHASE.COMBAT;
      return;
    }

    const spawned = this.director.update(dt, this);
    if (spawned) this.enemies.push(spawned);

    this.updatePlayer(dt, input, true);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updatePickups(dt);
    this.updateCombo(dt);
    this.checkWaveEnd();
    this.checkOutcome();
  }

  updateFloaters(dt) {
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt; f.y += f.vy * dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
  }

  addFloater(x, y, text, color = '#ffe9a8') {
    if (this.floaters.length > 40) this.floaters.shift();
    this.floaters.push({ x, y, vy: -46, life: 0.9, text, color });
  }

  updateCombo(dt) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
    } else if (this.combo > 1) {
      this.combo = Math.max(1, this.combo - COMBO.decayPerSecond * dt);
    }
  }

  registerKill(e) {
    this.kills++;
    this.comboTimer = COMBO.window;
    this.combo = Math.min(COMBO.maxMultiplier, this.combo + 0.25);
    const gained = Math.round(ENEMY_KINDS[e.kind].score * this.combo);
    this.score += gained;
    this.addFloater(e.x, e.y - 14, `+${gained}`, this.combo >= 4 ? '#ffb37a' : '#ffe9a8');
  }

  updatePlayer(dt, input, canFire) {
    const p = this.player;
    if (!p.alive) return;
    for (const k of ['fireTimer', 'dashCooldown', 'invulnTimer', 'hurtTimer', 'contactTimer', 'shieldTimer', 'starfireTimer', 'surgeTimer']) {
      if (p[k] > 0) p[k] -= dt;
    }
    p.aim = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);

    const mv = input.moveVector();
    const dashing = p.dashTimer > 0;
    if (input.dashPressed && p.dashCooldown <= 0) {
      p.dashTimer = PLAYER.dashTime;
      p.dashCooldown = PLAYER.dashCooldown;
      p.invulnTimer = Math.max(p.invulnTimer, PLAYER.dashInvuln);
      const dx = mv.x !== 0 || mv.y !== 0 ? mv.x : Math.cos(p.aim);
      const dy = mv.x !== 0 || mv.y !== 0 ? mv.y : Math.sin(p.aim);
      p.dashDirX = dx; p.dashDirY = dy;
      this.audio?.dash();
    }
    let speed = PLAYER.speed + (p.surgeTimer > 0 ? PICKUPS.surgeSpeedBonus : 0);
    if (dashing) {
      p.dashTimer -= dt;
      p.vx = (p.dashDirX || 0) * PLAYER.dashSpeed;
      p.vy = (p.dashDirY || 0) * PLAYER.dashSpeed;
      this.particles.dashTrail(p.x, p.y, p.vx, p.vy);
    } else {
      p.vx = mv.x * speed; p.vy = mv.y * speed;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.walkPhase += dt * (Math.abs(p.vx) + Math.abs(p.vy) > 4 ? 9 : 2);
    // Stay on the shore: clamp inside the arena disc.
    const dx = p.x - ARENA.cx, dy = p.y - ARENA.cy;
    const d = Math.hypot(dx, dy), maxD = ARENA.radius - p.radius - 4;
    if (d > maxD) { p.x = ARENA.cx + (dx / d) * maxD; p.y = ARENA.cy + (dy / d) * maxD; }

    if (canFire && input.firing && p.fireTimer <= 0) {
      p.fireTimer = 1 / PLAYER.fireRate;
      const spread = p.starfireTimer > 0 ? [-0.16, 0, 0.16] : [0];
      for (const off of spread) {
        this.bullets.push(makeBullet(p.x + Math.cos(p.aim) * 18, p.y + Math.sin(p.aim) * 18, p.aim + off + this.rng.range(-0.012, 0.012), true));
        p.shotsFired++;
      }
      this.particles.sparks(this.rng, p.x + Math.cos(p.aim) * 22, p.y + Math.sin(p.aim) * 22, p.aim);
      this.audio?.shoot();
    }
  }

  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.flash > 0) e.flash -= dt;
      if (e.touchTimer > 0) e.touchTimer -= dt;
      const v = steerEnemy(e, this, dt);
      e.vx = v.vx; e.vy = v.vy;
      e.x += e.vx * dt; e.y += e.vy * dt;

      // Spitter ranged attack.
      if (e.kind === 'spitter' && p.alive) {
        e.fireTimer -= dt;
        const dist = Math.hypot(p.x - e.x, p.y - e.y);
        if (e.fireTimer <= 0 && dist < 340) {
          e.fireTimer = ENEMY_KINDS.spitter.fireInterval * this.rng.range(0.85, 1.2);
          const target = this.rng.chance(0.7) ? p : this.core;
          const a = Math.atan2(target.y - e.y, target.x - e.x);
          const b = makeBullet(e.x, e.y, a, false);
          this.bullets.push(b);
        }
      }
      this.enemyContact(e, p, true);
      this.enemyContact(e, this.core, false);
    }
    // Gentle separation so enemies do not stack into one blob.
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const a = this.enemies[i], b = this.enemies[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy), min = a.radius + b.radius;
        if (d > 0.01 && d < min) {
          const push = ((min - d) / d) * 0.5;
          a.x -= dx * push * 0.5; a.y -= dy * push * 0.5;
          b.x += dx * push * 0.5; b.y += dy * push * 0.5;
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  enemyContact(e, target, isPlayer) {
    if (e.dead || !target.alive) return;
    const base = ENEMY_KINDS[e.kind];
    const dist = Math.hypot(target.x - e.x, target.y - e.y);
    if (dist >= e.radius + target.radius + base.contactRangePad) return;
    if (e.touchTimer > 0) return;
    e.touchTimer = 0.8;
    if (isPlayer) {
      if (target.invulnTimer > 0 || target.shieldTimer > 0) return;
      this.damagePlayer(base.damage);
      // Knock the enemy back so one touch is one hit, not a drain.
      const a = Math.atan2(e.y - target.y, e.x - target.x);
      e.x += Math.cos(a) * 22; e.y += Math.sin(a) * 22;
    } else {
      this.damageCore(base.coreDamage);
      const a = Math.atan2(e.y - target.y, e.x - target.x);
      e.x += Math.cos(a) * 18; e.y += Math.sin(a) * 18;
    }
  }

  damagePlayer(amount) {
    const p = this.player;
    if (!p.alive || p.invulnTimer > 0 || p.shieldTimer > 0) return;
    p.hp -= amount; p.hurtTimer = 0.25;
    this.audio?.playerHurt();
    if (p.hp <= 0) { p.hp = 0; p.alive = false; }
  }

  damageCore(amount) {
    const c = this.core;
    if (!c.alive) return;
    c.hp -= amount; c.hurtTimer = 0.3;
    this.shake = Math.min(14, this.shake + 6);
    this.audio?.coreHit();
    this.particles.burst(this.rng, c.x, c.y, 8, '#ffd98a', 200, 0.4, 3);
    if (c.hp <= 0) { c.hp = 0; c.alive = false; }
  }

  updateBullets(dt) {
    for (const b of this.bullets) {
      if (!b.alive) continue;
      b.life -= dt;
      if (b.life <= 0) { b.alive = false; continue; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      const dc = Math.hypot(b.x - ARENA.cx, b.y - ARENA.cy);
      if (dc > ARENA.radius + 90) { b.alive = false; continue; }
      if (b.friendly) this.bulletVsEnemies(b); else this.bulletVsHeroes(b);
    }
    this.bullets = this.bullets.filter((b) => b.alive);
  }

  bulletVsEnemies(b) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - b.x, e.y - b.y) > e.radius + b.radius) continue;
      b.alive = false;
      this.player.shotsHit++;
      e.hp -= b.damage; e.flash = 0.09;
      this.audio?.hit();
      this.particles.burst(this.rng, b.x, b.y, 3, '#ffe9a8', 140, 0.25, 2);
      if (e.hp <= 0) this.killEnemy(e);
      return;
    }
  }

  bulletVsHeroes(b) {
    const p = this.player, c = this.core;
    if (p.alive && Math.hypot(p.x - b.x, p.y - b.y) <= p.radius + b.radius) {
      b.alive = false;
      if (p.invulnTimer <= 0 && p.shieldTimer <= 0) this.damagePlayer(b.damage);
      return;
    }
    if (c.alive && Math.hypot(c.x - b.x, c.y - b.y) <= c.radius + b.radius) {
      b.alive = false;
      this.damageCore(b.damage);
    }
  }

  killEnemy(e) {
    e.dead = true;
    const big = e.kind === 'brute';
    this.registerKill(e);
    this.particles.gloomPuff(this.rng, e.x, e.y, big);
    this.audio?.enemyDeath(big);
    if (big) {
      this.shake = Math.min(14, this.shake + 5);
      // Brutes split into two skitters bursting outward.
      for (let i = 0; i < 2; i++) {
        const a = this.rng.angle();
        this.enemies.push(makeEnemy('skitter', e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20, this.rng));
      }
    }
    const drop = rollDrop(this.rng, e.kind, PICKUPS);
    if (drop) this.pickups.push(makePickup(drop, e.x, e.y));
  }

  updatePickups(dt) {
    const p = this.player;
    for (const pk of this.pickups) {
      if (!pk.alive) continue;
      pk.life -= dt; pk.bob += dt * 3;
      if (pk.life <= 0) { pk.alive = false; continue; }
      if (p.alive && Math.hypot(p.x - pk.x, p.y - pk.y) <= p.radius + pk.radius + 4) {
        pk.alive = false;
        this.applyPickup(pk.kind);
      }
    }
    this.pickups = this.pickups.filter((k) => k.alive);
  }

  applyPickup(kind) {
    const p = this.player;
    this.audio?.pickup();
    if (kind === 'repair') {
      this.core.hp = Math.min(this.core.maxHp, this.core.hp + PICKUPS.repairAmount);
      this.addFloater(this.core.x, this.core.y - 44, `CORE +${PICKUPS.repairAmount}`, '#8affc1');
    } else if (kind === 'starfire') { p.starfireTimer = PICKUPS.starfireTime; this.addFloater(p.x, p.y - 24, 'STARFIRE!', '#ffd98a'); }
    else if (kind === 'aegis') { p.shieldTimer = PICKUPS.aegisTime; this.addFloater(p.x, p.y - 24, 'AEGIS!', '#9ad6ff'); }
    else if (kind === 'surge') { p.surgeTimer = PICKUPS.surgeTime; p.dashCooldown = 0; this.addFloater(p.x, p.y - 24, 'SURGE!', '#c1ff9a'); }
    this.score += 25;
  }

  checkWaveEnd() {
    if (this.phase !== PHASE.COMBAT) return;
    if (this.director.pending > 0 || this.enemies.length > 0) return;
    if (this.waveIndex >= WAVES.length - 1) return; // outcome check declares victory
    this.beginWave(this.waveIndex + 1);
  }

  checkOutcome() {
    if (this.phase === PHASE.DONE) return;
    if (!this.core.alive || !this.player.alive) {
      this.phase = PHASE.DONE;
      this.outcome = 'defeat';
      this.outcomeReason = !this.core.alive ? 'The Heartlight was extinguished.' : 'The Tidewarden fell.';
      this.saveBest();
      this.audio?.defeat();
      this.events.push({ type: 'defeat' });
      return;
    }
    if (this.waveIndex === WAVES.length - 1 && this.director.pending === 0 && this.enemies.length === 0) {
      this.phase = PHASE.DONE;
      this.outcome = 'victory';
      this.score += Math.round(this.core.hp) * 2 + Math.round(this.player.hp) * 2; // survival bonus
      this.saveBest();
      this.audio?.victory();
      this.events.push({ type: 'victory' });
    }
  }
}
