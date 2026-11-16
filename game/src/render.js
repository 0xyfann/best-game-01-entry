// render.js — all canvas drawing for Tidewarden gameplay: background, arena,
// entities, particles, HUD and wave banners. Pure presentation: it reads the
// world and never mutates simulation state (except cosmetic timers passed in).

import { VIEW, ARENA, SKY_STOPS } from './config.js';

function lerp(a, b, t) { return a + (b - a) * t; }
function hexRgb(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
function mixHex(h1, h2, t) {
  const a = hexRgb(h1), b = hexRgb(h2);
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
}
export function skyFor(progress) {
  const stops = SKY_STOPS;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1];
    if (progress >= a.t && progress <= b.t) {
      const t = (progress - a.t) / Math.max(0.0001, b.t - a.t);
      return { top: mixHex(a.top, b.top, t), mid: mixHex(a.mid, b.mid, t), glow: mixHex(a.glow, b.glow, t) };
    }
  }
  const last = stops[stops.length - 1];
  return { top: last.top, mid: last.mid, glow: last.glow };
}

// Deterministic starfield, generated once from a fixed seed array (no RNG at draw time).
const STARS = [];
for (let i = 0; i < 90; i++) {
  STARS.push({ x: ((i * 137.5) % 1280), y: ((i * 89.3) % 720), r: 0.6 + ((i * 7) % 10) / 7, tw: (i % 5) * 0.4 });
}

export function drawBackground(ctx, world, time) {
  const progress = world.waveIndex / 9;
  const sky = skyFor(progress);
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, sky.top); grad.addColorStop(1, sky.mid);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Stars fade in as dusk deepens.
  ctx.save();
  for (const s of STARS) {
    const a = 0.15 + progress * 0.6 + Math.sin(time * 1.4 + s.tw) * 0.12;
    ctx.globalAlpha = Math.max(0.04, a);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // Distant glow on the horizon behind the arena.
  const glow = ctx.createRadialGradient(ARENA.cx, ARENA.cy, 60, ARENA.cx, ARENA.cy, 520);
  glow.addColorStop(0, sky.glow + ''); glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = glow; ctx.fillRect(0, 0, VIEW.width, VIEW.height); ctx.restore();
}

export function drawArena(ctx, world, time) {
  // Animated waterline rings outside the shore.
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const rr = ARENA.radius + 18 + i * 16 + Math.sin(time * 1.1 + i * 1.7) * 3;
    ctx.strokeStyle = `rgba(140,200,255,${0.16 - i * 0.04})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ARENA.cx, ARENA.cy, rr, 0, Math.PI * 2); ctx.stroke();
  }
  // Shore disc.
  const sand = ctx.createRadialGradient(ARENA.cx, ARENA.cy, 40, ARENA.cx, ARENA.cy, ARENA.radius);
  sand.addColorStop(0, '#3d4a63'); sand.addColorStop(0.8, '#2e3a52'); sand.addColorStop(1, '#24304a');
  ctx.fillStyle = sand;
  ctx.beginPath(); ctx.arc(ARENA.cx, ARENA.cy, ARENA.radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,217,138,0.5)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(ARENA.cx, ARENA.cy, ARENA.radius, 0, Math.PI * 2); ctx.stroke();
  // Rune ring ticks.
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + time * 0.02;
    ctx.beginPath();
    ctx.moveTo(ARENA.cx + Math.cos(a) * (ARENA.radius - 14), ARENA.cy + Math.sin(a) * (ARENA.radius - 14));
    ctx.lineTo(ARENA.cx + Math.cos(a) * (ARENA.radius - 6), ARENA.cy + Math.sin(a) * (ARENA.radius - 6));
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCore(ctx, world) {
  const c = world.core;
  const pulse = 1 + Math.sin(c.pulse) * 0.07;
  ctx.save();
  ctx.translate(c.x, c.y);
  const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, c.radius * 2.6 * pulse);
  halo.addColorStop(0, 'rgba(255,217,138,0.55)'); halo.addColorStop(1, 'rgba(255,217,138,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(0, 0, c.radius * 2.6 * pulse, 0, Math.PI * 2); ctx.fill();
  if (!c.alive) {
    ctx.fillStyle = '#4a4450';
    ctx.beginPath(); ctx.arc(0, 0, c.radius * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#221f28'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-14, -10); ctx.lineTo(2, 2); ctx.lineTo(-6, 14); ctx.stroke();
    ctx.restore(); return;
  }
  ctx.rotate(Math.sin(c.pulse * 0.4) * 0.12);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = c.hurtTimer > 0 ? '#ff9a8a' : '#ffd98a';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = Math.cos(a) * c.radius, py = Math.sin(a) * c.radius;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff3cf';
  ctx.beginPath(); ctx.arc(0, 0, c.radius * 0.42, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

const ENEMY_STYLE = {
  drifter: { body: '#6a55a3', eye: '#e8dcff', spikes: 5 },
  skitter: { body: '#8a4d9e', eye: '#ffd1f2', spikes: 3 },
  brute: { body: '#4a3566', eye: '#ff9a8a', spikes: 8 },
  spitter: { body: '#3f6b4f', eye: '#c8ffd9', spikes: 4 },
};

export function drawEnemy(ctx, e) {
  const st = ENEMY_STYLE[e.kind];
  ctx.save();
  ctx.translate(e.x, e.y);
  const wob = Math.sin(e.wobble * 3) * 0.08;
  ctx.rotate(wob);
  ctx.fillStyle = e.flash > 0 ? '#ffffff' : st.body;
  ctx.beginPath();
  const spikes = st.spikes;
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? e.radius : e.radius * 0.72;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = st.eye;
  ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#17102a';
  ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (e.hp < e.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(e.x - e.radius, e.y - e.radius - 9, e.radius * 2, 4);
    ctx.fillStyle = '#ff7a6b';
    ctx.fillRect(e.x - e.radius, e.y - e.radius - 9, e.radius * 2 * Math.max(0, e.hp / e.maxHp), 4);
  }
}

export function drawPlayer(ctx, world) {
  const p = world.player;
  if (!p.alive) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.shieldTimer > 0) {
    ctx.strokeStyle = 'rgba(154,214,255,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, p.radius + 8 + Math.sin(world.time * 6) * 1.5, 0, Math.PI * 2); ctx.stroke();
  }
  const blink = p.invulnTimer > 0 && Math.floor(world.time * 18) % 2 === 0;
  ctx.globalAlpha = blink ? 0.45 : 1;
  // Lantern glow.
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 44);
  glow.addColorStop(0, 'rgba(255,233,168,0.5)'); glow.addColorStop(1, 'rgba(255,233,168,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
  // Cloak.
  ctx.fillStyle = p.hurtTimer > 0 ? '#ff9a8a' : '#2f7d8c';
  ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.arc(0, -3, 6.5, 0, Math.PI * 2); ctx.fill();
  // Aiming staff toward the mouse.
  ctx.rotate(p.aim);
  ctx.fillStyle = '#d9b06a';
  ctx.fillRect(6, -2, 16, 4);
  ctx.fillStyle = '#fff3cf';
  ctx.beginPath(); ctx.arc(24, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawBullets(ctx, world) {
  for (const b of world.bullets) {
    ctx.save();
    ctx.translate(b.x, b.y);
    if (b.friendly) {
      ctx.fillStyle = '#fff3cf';
      ctx.shadowColor = '#ffd98a'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, 0, b.radius, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#b06ae0';
      ctx.shadowColor = '#7a3fa8'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, 0, b.radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

const PICKUP_STYLE = {
  repair: { color: '#8affc1', label: '+' },
  starfire: { color: '#ffd98a', label: '*' },
  aegis: { color: '#9ad6ff', label: 'O' },
  surge: { color: '#c1ff9a', label: '>' },
};

export function drawPickups(ctx, world) {
  for (const pk of world.pickups) {
    const st = PICKUP_STYLE[pk.kind];
    const y = pk.y + Math.sin(pk.bob) * 3;
    const fade = pk.life < 2.5 ? (Math.floor(pk.life * 6) % 2 === 0 ? 0.35 : 1) : 1;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(pk.x, y);
    ctx.fillStyle = 'rgba(10,14,24,0.7)';
    ctx.beginPath(); ctx.arc(0, 0, pk.radius + 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = st.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, pk.radius + 2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = st.color;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(st.label, 0, 1);
    ctx.restore();
  }
}

export function drawFloaters(ctx, world) {
  ctx.save();
  ctx.textAlign = 'center'; ctx.font = 'bold 15px system-ui, sans-serif';
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.min(1, f.life * 1.6);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}

function bar(ctx, x, y, w, h, frac, fill, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#2a3247'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 5, y + h / 2 + 0.5);
}

export function drawHUD(ctx, world) {
  const p = world.player, c = world.core;
  ctx.save();
  bar(ctx, 18, 16, 210, 16, p.hp / p.maxHp, '#57d9a3', `WARDEN ${Math.ceil(p.hp)}`);
  bar(ctx, 18, 38, 210, 16, c.hp / c.maxHp, '#ffd98a', `HEARTLIGHT ${Math.ceil(c.hp)}`);
  // Dash cooldown pip.
  const dashFrac = 1 - Math.max(0, p.dashCooldown) / 1.6;
  bar(ctx, 18, 60, 110, 10, dashFrac, '#9ad6ff', 'DASH');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, sans-serif'; ctx.textAlign = 'right';
  ctx.fillText(String(world.score), VIEW.width - 18, 30);
  ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(`BEST ${world.best}`, VIEW.width - 18, 50);
  ctx.textAlign = 'center';
  ctx.font = 'bold 17px system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.fillText(`WAVE ${world.waveNumber} / 10`, VIEW.width / 2, 28);
  ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`Gloom remaining: ${world.remaining}`, VIEW.width / 2, 48);
  if (world.combo > 1.05) {
    ctx.font = 'bold 16px system-ui, sans-serif'; ctx.fillStyle = '#ffb37a';
    ctx.fillText(`COMBO x${world.combo.toFixed(1)}`, VIEW.width / 2, 70);
  }
  const buffs = [];
  if (p.starfireTimer > 0) buffs.push(`STARFIRE ${Math.ceil(p.starfireTimer)}s`);
  if (p.shieldTimer > 0) buffs.push(`AEGIS ${Math.ceil(p.shieldTimer)}s`);
  if (p.surgeTimer > 0) buffs.push(`SURGE ${Math.ceil(p.surgeTimer)}s`);
  ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = '#cfe8ff'; ctx.textAlign = 'left';
  buffs.forEach((t, i) => ctx.fillText(t, 18, 92 + i * 16));
  ctx.restore();
}

export function drawBanner(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,10,20,0.45)'; ctx.fillRect(0, VIEW.height / 2 - 64, VIEW.width, 128);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText(`WAVE ${world.waveNumber}`, VIEW.width / 2, VIEW.height / 2 - 2);
  ctx.fillStyle = '#ffffff'; ctx.font = '17px system-ui, sans-serif';
  ctx.fillText(waveTagline(world.waveNumber), VIEW.width / 2, VIEW.height / 2 + 30);
  ctx.restore();
}

function waveTagline(n) {
  const lines = ['', 'The tide stirs…', 'Skitters on the shore', 'A voice spits from the dark', 'Something huge approaches', 'Hold the light', 'The tide quickens', 'Hold the light', 'The dark presses in', 'Nearly dawn — hold on', 'The final tide'];
  return lines[n] || 'Hold the light';
}

// Full gameplay frame, with screen shake applied.
export function drawWorld(ctx, world, time) {
  ctx.save();
  if (world.shake > 0.2) {
    ctx.translate((Math.sin(time * 91) * world.shake) / 2, (Math.cos(time * 83) * world.shake) / 2);
  }
  drawBackground(ctx, world, time);
  drawArena(ctx, world, time);
  drawPickups(ctx, world);
  drawCore(ctx, world);
  for (const e of world.enemies) drawEnemy(ctx, e);
  drawPlayer(ctx, world);
  drawBullets(ctx, world);
  world.particles.draw(ctx);
  drawFloaters(ctx, world);
  ctx.restore();
  drawHUD(ctx, world);
  if (world.phase === 'banner') drawBanner(ctx, world);
}
