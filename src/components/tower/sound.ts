/**
 * Sound for the games, synthesised with Web Audio: a handful of oscillator chirps, no audio
 * files. The context is created on first use and resumed on every sound, since browsers keep
 * it suspended until the page has seen a click or a key. One mute switch for every game.
 */
import { readStored, writeStored } from "@/lib/storage";

// the key dates from when only the floor-13 game had sound; kept so a visitor's choice holds
const MUTE_KEY = "prime-tower-pacman-muted";
const VOLUME = 0.22;

export type Note = { f: number; to?: number; at: number; dur: number; type?: OscillatorType; gain?: number };

/** A run of triangle notes, one every `each` seconds. */
export const tune = (freqs: number[], each: number, gain = 0.6): Note[] => freqs.map((f, i) => ({ f, at: i * each, dur: each, type: "triangle", gain }));

class Sound {
  muted = readStored(MUTE_KEY) === "1";
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;

  setMuted(muted: boolean): void {
    this.muted = muted;
    writeStored(MUTE_KEY, muted ? "1" : "0");
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

  /** Play a few oscillator notes. */
  notes(notes: Note[]): void {
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
    const opening = [523, 659, 784, 659, 784, 1047];
    this.notes(opening.map((f, i) => ({ f, at: i * 0.13, dur: 0.12, type: "triangle", gain: 0.7 })));
  }
}

export const sound = new Sound();
