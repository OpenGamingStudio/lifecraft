import type { SfxName } from '../game';

/** Sons synthétisés avec WebAudio : aucun fichier audio. */
export class Sfx {
  muted = false;
  private ctx: AudioContext | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private last: Record<string, number> = {};

  /** À appeler depuis un geste de l'utilisateur (politique d'autoplay). */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const n = this.ctx.sampleRate / 2;
      this.noiseBuf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, to = freq, delay = 0): void {
    const c = this.ctx!;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, freq: number, type: BiquadFilterType = 'lowpass'): void {
    const c = this.ctx!;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    s.connect(f).connect(g).connect(c.destination);
    s.start(0, Math.random() * 0.4, dur + 0.02);
  }

  play(name: SfxName): void {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - (this.last[name] ?? -1) < 0.04) return;
    this.last[name] = now;
    switch (name) {
      case 'mine': this.noise(0.07, 0.35, 1800, 'bandpass'); this.tone(180, 0.06, 'square', 0.05); break;
      case 'break': this.noise(0.18, 0.5, 900); this.tone(130, 0.14, 'triangle', 0.18, 70); break;
      case 'place': this.tone(240, 0.07, 'square', 0.1, 150); this.noise(0.04, 0.2, 700); break;
      case 'jump': this.tone(280, 0.14, 'sine', 0.14, 560); break;
      case 'land': this.noise(0.1, 0.35, 350); break;
      case 'hurt': this.tone(220, 0.25, 'sawtooth', 0.14, 70); this.noise(0.12, 0.3, 500); break;
      case 'die': this.tone(300, 0.7, 'sawtooth', 0.14, 40); break;
      case 'respawn': [440, 554, 659].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.12, f, i * 0.09)); break;
      case 'craft': [330, 440].forEach((f, i) => this.tone(f, 0.1, 'square', 0.08, f * 1.25, i * 0.07)); this.noise(0.05, 0.2, 2400, 'bandpass'); break;
      case 'snap': this.noise(0.08, 0.6, 3200, 'highpass'); this.tone(520, 0.1, 'sawtooth', 0.14, 90); this.tone(160, 0.2, 'triangle', 0.16, 60, 0.05); break;
      case 'full': this.tone(120, 0.12, 'square', 0.08); break;
    }
  }
}
