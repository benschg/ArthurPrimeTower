/**
 * Sound for the floor-13 game, synthesised with Web Audio: a handful of oscillator chirps,
 * no audio files. The context is created on first use and resumed on every sound, since
 * browsers keep it suspended until the page has seen a click or a key.
 */
import type { PacEvent } from "./game";

const MUTE_KEY = "prime-tower-pacman-muted";
const VOLUME = 0.22;

type Note = { f: number; to?: number; at: number; dur: number; type?: OscillatorType; gain?: number };

class Sound {
  muted = false;
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private waka = false;

  constructor() {
    try {
      this.muted = typeof window !== "undefined" && window.localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      /* storage unavailable */
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }

  /** Call from a key press or click: lets a context that started suspended begin to play. */
  wake(): void {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  private context(): AudioContext | null {
    if (typeof window === "undefined" || typeof AudioContext === "undefined") return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.out = this.ctx.createGain();
      this.out.gain.value = VOLUME;
      this.out.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private notes(notes: Note[]): void {
    if (this.muted) return;
    const ctx = this.context();
    if (!ctx) return;
    if (ctx.state === "running") {
      this.schedule(ctx, notes);
      return;
    }
    // A new or suspended context takes a moment to start, or waits for a click or key. Play
    // only if it starts right away: sounds that are stale by then would all go off at once.
    const asked = performance.now();
    void ctx.resume().then(() => {
      if (performance.now() - asked < 400) this.schedule(ctx, notes);
    });
  }

  private schedule(ctx: AudioContext, notes: Note[]): void {
    if (!this.out) return;
    for (const n of notes) {
      const t0 = ctx.currentTime + n.at;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = n.type ?? "square";
      osc.frequency.setValueAtTime(n.f, t0);
      if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, t0 + n.dur);
      const peak = n.gain ?? 0.5;
      env.gain.setValueAtTime(0, t0);
      env.gain.linearRampToValueAtTime(peak, t0 + 0.008);
      env.gain.setValueAtTime(peak, t0 + n.dur * 0.7);
      env.gain.linearRampToValueAtTime(0, t0 + n.dur);
      osc.connect(env).connect(this.out);
      osc.start(t0);
      osc.stop(t0 + n.dur + 0.02);
    }
  }

  /** A short tune as a game begins. */
  start(): void {
    const tune = [523, 659, 784, 659, 784, 1047];
    this.notes(tune.map((f, i) => ({ f, at: i * 0.13, dur: 0.12, type: "triangle", gain: 0.7 })));
  }

  play(event: PacEvent): void {
    switch (event) {
      case "dot":
        // waka, waka: every other dot chirps up, the next one down
        this.waka = !this.waka;
        this.notes([this.waka ? { f: 330, to: 620, at: 0, dur: 0.07, type: "triangle", gain: 0.6 } : { f: 620, to: 330, at: 0, dur: 0.07, type: "triangle", gain: 0.6 }]);
        return;
      case "power":
        this.notes([220, 330, 440, 660].map((f, i) => ({ f, to: f * 1.5, at: i * 0.06, dur: 0.09, gain: 0.35 })));
        return;
      case "ghost":
        this.notes([{ f: 300, to: 1400, at: 0, dur: 0.28, gain: 0.35 }]);
        return;
      case "caught":
        this.notes(Array.from({ length: 9 }, (_, i) => ({ f: 640 * 0.82 ** i, to: 520 * 0.82 ** i, at: i * 0.12, dur: 0.12, type: "sawtooth" as const, gain: 0.3 })));
        return;
      case "clear":
        this.notes([523, 659, 784, 1047, 784, 1047, 1319].map((f, i) => ({ f, at: i * 0.11, dur: 0.11, type: "triangle" as const, gain: 0.7 })));
        return;
      case "over":
        this.notes([392, 330, 262, 196].map((f, i) => ({ f, at: i * 0.26, dur: 0.26, type: "triangle" as const, gain: 0.6 })));
        return;
    }
  }
}

export const sound = new Sound();
