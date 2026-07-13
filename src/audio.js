/**
 * Tiny generated ambience — no audio files needed.
 * PLACEHOLDER: replace with a real track by loading an <audio> element or
 * an AudioBuffer from /public/audio/ and keeping the same start/stop API.
 */

const SCALE = [0, 3, 5, 7, 10, 12, 15]; // C minor pentatonic-ish, warm
const ROOT = 220; // A3

function noteHz(semitonesFromRoot) {
  return ROOT * Math.pow(2, semitonesFromRoot / 12);
}

export class Ambience {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.timer = null;
    this.playing = false;
  }

  _ensure() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    // A soft lowpass so everything sounds like it's coming from an old radio
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1600;
    this.master.connect(lp).connect(this.ctx.destination);
  }

  _pluck(hz, when, dur = 2.2, vol = 0.16) {
    const o = this.ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = hz;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(this.master);
    o.start(when);
    o.stop(when + dur + 0.1);
  }

  _pad(hz, when, dur = 6, vol = 0.05) {
    for (const detune of [-4, 4]) {
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = hz;
      o.detune.value = detune;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(vol, when + dur * 0.4);
      g.gain.linearRampToValueAtTime(0, when + dur);
      o.connect(g).connect(this.master);
      o.start(when);
      o.stop(when + dur + 0.1);
    }
  }

  _scheduleBar() {
    const t = this.ctx.currentTime + 0.05;
    // slow pad root + fifth
    this._pad(noteHz(SCALE[0]) / 2, t, 7.5);
    this._pad(noteHz(SCALE[3]) / 2, t + 0.1, 7.5);
    // sparse melody plucks
    let cursor = t + 0.4;
    const steps = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < steps; i++) {
      const deg = SCALE[Math.floor(Math.random() * SCALE.length)];
      this._pluck(noteHz(deg), cursor, 2.4, 0.09 + Math.random() * 0.06);
      cursor += 0.9 + Math.random() * 1.4;
    }
  }

  start() {
    this._ensure();
    if (this.ctx.state === "suspended") this.ctx.resume();
    if (this.playing) return;
    this.playing = true;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0.9, this.ctx.currentTime + 1.5);
    this._scheduleBar();
    this.timer = setInterval(() => this._scheduleBar(), 7000);
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(this.master.gain.value, this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.8);
  }

  toggle() {
    this.playing ? this.stop() : this.start();
    return this.playing;
  }

  /** Two soft "hoo hoo"s when the owl is clicked. */
  hoot() {
    this._ensure();
    if (this.ctx.state === "suspended") this.ctx.resume();
    const t0 = this.ctx.currentTime + 0.02;
    for (const dt of [0, 0.38]) {
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(392, t0 + dt);
      o.frequency.exponentialRampToValueAtTime(300, t0 + dt + 0.25);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t0 + dt);
      g.gain.linearRampToValueAtTime(0.22, t0 + dt + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.32);
      o.connect(g).connect(this.ctx.destination);
      o.start(t0 + dt);
      o.stop(t0 + dt + 0.4);
    }
  }
}
