// input.js — keyboard + mouse state for Tidewarden.
// Holds continuous state (held keys, mouse position, firing) plus one-frame edge
// flags (dashPressed, pausePressed, confirmPressed) that main.js consumes each step.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseX = 640; this.mouseY = 200;
    this.mouseDown = false;
    this.dashPressed = false;
    this.pausePressed = false;
    this.confirmPressed = false;
    this.mutePressed = false;
    this._onKeyDown = (e) => this.keyDown(e);
    this._onKeyUp = (e) => this.keys.delete(norm(e));
    this._onMouseMove = (e) => this.mouseMove(e);
    this._onMouseDown = (e) => { if (e.button === 0) this.mouseDown = true; };
    this._onMouseUp = (e) => { if (e.button === 0) this.mouseDown = false; };
    this._onBlur = () => { this.keys.clear(); this.mouseDown = false; };
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
  }

  keyDown(e) {
    const k = norm(e);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (e.repeat) return;
    this.keys.add(k);
    if (k === ' ' || k === 'shift') this.dashPressed = true;
    if (k === 'p' || k === 'escape') this.pausePressed = true;
    if (k === 'enter') this.confirmPressed = true;
    if (k === 'm') this.mutePressed = true;
  }

  mouseMove(e) {
    const r = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / Math.max(1, r.width);
    const sy = this.canvas.height / Math.max(1, r.height);
    this.mouseX = (e.clientX - r.left) * sx;
    this.mouseY = (e.clientY - r.top) * sy;
  }

  // Movement vector from WASD / arrows, normalised to length <= 1.
  moveVector() {
    let x = 0, y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }

  get firing() { return this.mouseDown || this.keys.has('j'); }

  // Called once per rendered frame after edges have been read.
  endFrame() { this.dashPressed = false; this.pausePressed = false; this.confirmPressed = false; this.mutePressed = false; }
}

function norm(e) {
  if (e.key === ' ') return ' ';
  return String(e.key || '').toLowerCase();
}
