// screens.js — full-screen states for Tidewarden: title, pause, victory, game over.
// These draw over the live (or frozen) arena so every screen still shows the game.

import { VIEW } from './config.js';

function panel(ctx, title, titleColor = '#ffd98a') {
  ctx.save();
  ctx.fillStyle = 'rgba(6,8,16,0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillText(title, VIEW.width / 2, 190);
  ctx.restore();
}

function statsBlock(ctx, stats, y = 300) {
  const rows = [
    ['Score', String(stats.score)],
    ['Best', String(stats.best)],
    ['Time', formatTime(stats.time)],
    ['Kills', String(stats.kills)],
    ['Accuracy', `${stats.accuracy}%`],
    ['Wave reached', `${stats.wave} / 10`],
  ];
  ctx.save();
  ctx.font = '19px system-ui, sans-serif';
  rows.forEach(([k, v], i) => {
    const yy = y + i * 30;
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.textAlign = 'right';
    ctx.fillText(k, VIEW.width / 2 - 14, yy);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText(v, VIEW.width / 2 + 14, yy);
    ctx.font = '19px system-ui, sans-serif';
  });
  ctx.restore();
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function drawTitle(ctx, best) {
  panel(ctx, 'TIDEWARDEN');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Guard the Heartlight against the gloom tide — survive all 10 waves.', VIEW.width / 2, 245);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const lines = [
    'WASD / Arrows — move        Mouse — aim        Hold mouse / J — fire',
    'Space / Shift — dash (brief invulnerability)        P / Esc — pause        M — mute',
    'Drifters chase you. Skitters zig-zag. Brutes split. Spitters shoot from range.',
    'Grab pickups:  + Repair core   * Starfire spread   O Aegis shield   > Surge speed',
  ];
  lines.forEach((t, i) => ctx.fillText(t, VIEW.width / 2, 300 + i * 26));
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = '#ffd98a';
  ctx.fillText('Press ENTER to begin', VIEW.width / 2, 470);
  if (best > 0) {
    ctx.font = '16px system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
    ctx.fillText(`Best score: ${best}`, VIEW.width / 2, 510);
  }
  ctx.restore();
}

export function drawPause(ctx) {
  panel(ctx, 'PAUSED', '#ffffff');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff'; ctx.font = '19px system-ui, sans-serif';
  ctx.fillText('Press P or Esc to resume', VIEW.width / 2, 300);
  ctx.fillText('The tide waits for no one — but it will wait for this screen.', VIEW.width / 2, 332);
  ctx.restore();
}

export function drawVictory(ctx, stats) {
  panel(ctx, 'DAWN BREAKS — VICTORY');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff'; ctx.font = '19px system-ui, sans-serif';
  ctx.fillText('The gloom tide recedes. The Heartlight still burns because you held it.', VIEW.width / 2, 240);
  ctx.restore();
  statsBlock(ctx, stats, 292);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd98a'; ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('Press ENTER to play again', VIEW.width / 2, 292 + 6 * 30 + 36);
  ctx.restore();
}

export function drawGameOver(ctx, stats, reason) {
  panel(ctx, 'THE LIGHT GOES OUT', '#ff9a8a');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff'; ctx.font = '19px system-ui, sans-serif';
  ctx.fillText(reason || 'The Heartlight was extinguished.', VIEW.width / 2, 240);
  ctx.restore();
  statsBlock(ctx, stats, 292);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd98a'; ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('Press ENTER to try again', VIEW.width / 2, 292 + 6 * 30 + 36);
  ctx.restore();
}
