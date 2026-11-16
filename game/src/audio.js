// audio.js — WebAudio synthesis for Tidewarden: no audio files, everything is oscillators.
// SFX are short enveloped blips/noise bursts; the ambient pad is two detuned triangles
// through a slow LFO gain, started on the first user gesture. M toggles mute.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ambientNodes = null;
    this.lastShootAt = 0;
  }

  // Must be called from a user gesture at least once.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.startAmbient();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setMuted(m) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
  }

  toggleMute() { this.setMuted(!this.muted); return this.muted; }

  tone({ freq = 440, freqEnd = null, type = 'sine', dur = 0.12, vol = 0.2, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  noise({ dur = 0.15, vol = 0.18, delay = 0, low = 400, high = 2400 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const filter = this.ctx.createBiquadFilter(); filter.type = 'bandpass';
    filter.frequency.value = (low + high) / 2; filter.Q.value = 0.7;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start(t0);
  }

  shoot() {
    const now = performance.now();
    if (now - this.lastShootAt < 45) return; // avoid machine-gun clipping
    this.lastShootAt = now;
    this.tone({ freq: 880, freqEnd: 320, type: 'square', dur: 0.07, vol: 0.07 });
  }
  hit() { this.tone({ freq: 300, freqEnd: 180, type: 'triangle', dur: 0.05, vol: 0.08 }); }
  enemyDeath(big = false) {
    this.noise({ dur: big ? 0.32 : 0.16, vol: big ? 0.26 : 0.15 });
    this.tone({ freq: big ? 160 : 240, freqEnd: 50, type: 'sawtooth', dur: big ? 0.3 : 0.14, vol: 0.12 });
  }
  playerHurt() { this.tone({ freq: 200, freqEnd: 90, type: 'sawtooth', dur: 0.16, vol: 0.16 }); }
  coreHit() {
    this.tone({ freq: 120, freqEnd: 60, type: 'sine', dur: 0.28, vol: 0.3 });
    this.noise({ dur: 0.2, vol: 0.12, low: 100, high: 700 });
  }
  dash() { this.noise({ dur: 0.12, vol: 0.08, low: 900, high: 3200 }); }
  pickup() {
    this.tone({ freq: 660, type: 'sine', dur: 0.09, vol: 0.14 });
    this.tone({ freq: 990, type: 'sine', dur: 0.12, vol: 0.14, delay: 0.07 });
  }
  waveStart() {
    this.tone({ freq: 392, type: 'triangle', dur: 0.16, vol: 0.16 });
    this.tone({ freq: 587, type: 'triangle', dur: 0.22, vol: 0.16, delay: 0.12 });
  }
  victory() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.24, vol: 0.16, delay: i * 0.13 }));
  }
  defeat() {
    [392, 330, 262, 196].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.16, delay: i * 0.16 }));
  }

  startAmbient() {
    if (!this.ctx || this.ambientNodes) return;
    const g = this.ctx.createGain(); g.gain.value = 0.035;
    const o1 = this.ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = 110;
    const o2 = this.ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 164.8;
    const o3 = this.ctx.createOscillator(); o3.type = 'sine'; o3.frequency.value = 220.5;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain(); lfoGain.gain.value = 0.014;
    lfo.connect(lfoGain); lfoGain.connect(g.gain);
    o1.connect(g); o2.connect(g); o3.connect(g); g.connect(this.master);
    o1.start(); o2.start(); o3.start(); lfo.start();
    this.ambientNodes = { g, o1, o2, o3, lfo };
  }
}
