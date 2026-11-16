// particles.js — fixed-size particle pool and emitters for Tidewarden.
// Particles are plain objects recycled in place; emitters never allocate per frame
// beyond the pool, which keeps the hot loop garbage-free.

const MAX = 900;

export class ParticlePool {
  constructor() {
    this.items = [];
    for (let i = 0; i < MAX; i++) {
      this.items.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff', drag: 1, grav: 0, shrink: true });
    }
    this.cursor = 0;
  }

  spawn(x, y, vx, vy, life, size, color, opts = {}) {
    const p = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % MAX;
    p.alive = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = life; p.maxLife = life; p.size = size; p.color = color;
    p.drag = opts.drag ?? 2.2; p.grav = opts.grav ?? 0; p.shrink = opts.shrink ?? true;
    return p;
  }

  burst(rng, x, y, count, color, speed = 160, life = 0.5, size = 3) {
    for (let i = 0; i < count; i++) {
      const a = rng.angle(); const s = speed * (0.3 + rng.float() * 0.9);
      this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.5 + rng.float()), size * (0.6 + rng.float() * 0.8), color);
    }
  }

  sparks(rng, x, y, dirAngle) {
    for (let i = 0; i < 6; i++) {
      const a = dirAngle + rng.range(-0.6, 0.6); const s = rng.range(120, 320);
      this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, rng.range(0.12, 0.3), rng.range(1.5, 3), '#ffe9a8', { drag: 4 });
    }
  }

  gloomPuff(rng, x, y, big = false) {
    const n = big ? 26 : 13;
    for (let i = 0; i < n; i++) {
      const a = rng.angle(); const s = rng.range(20, big ? 150 : 100);
      this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, rng.range(0.35, 0.8), rng.range(3, big ? 9 : 6),
        rng.pick(['#5b4a8a', '#3d2f63', '#7a5fa8', '#2a2145']), { drag: 1.4 });
    }
  }

  dashTrail(x, y, vx, vy) {
    this.spawn(x, y, -vx * 0.08, -vy * 0.08, 0.32, 9, 'rgba(150,220,255,0.55)', { drag: 0.4, shrink: true });
  }

  smoke(rng, x, y) {
    this.spawn(x + rng.range(-14, 14), y + rng.range(-10, 6), rng.range(-8, 8), rng.range(-34, -16),
      rng.range(0.8, 1.6), rng.range(6, 13), 'rgba(90,88,100,0.5)', { drag: 0.2, shrink: false });
  }

  update(dt) {
    for (const p of this.items) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; continue; }
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d; p.vy = p.vy * d + p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    for (const p of this.items) {
      if (!p.alive) continue;
      const f = p.life / p.maxLife;
      ctx.globalAlpha = Math.min(1, f * 1.4);
      ctx.fillStyle = p.color;
      const s = p.shrink ? Math.max(0.4, p.size * f) : p.size;
      ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  clear() { for (const p of this.items) p.alive = false; }
}
