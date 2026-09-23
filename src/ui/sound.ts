interface Tone {
  freq: number;
  at: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

/** 用 WebAudio 合成的轻量音效，无需音频资源 */
class SoundFX {
  private ctx: AudioContext | null = null;
  private pending: Tone[][] = [];

  async unlock() {
    const ctx = this.ensure();
    if (!ctx || this.isRunning(ctx)) return;

    try {
      await ctx.resume();
      if (this.isRunning(ctx)) {
        const pending = this.pending.splice(0);
        pending.forEach((notes) => this.schedule(ctx, notes));
      }
    } catch {
      // 浏览器禁用音频时保持静默，游戏本身仍可正常进行。
    }
  }

  private ensure(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) return null;
        this.ctx = new AudioContextCtor();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private isRunning(ctx: AudioContext) {
    return ctx.state === "running";
  }

  private play(notes: Tone[]) {
    const ctx = this.ensure();
    if (!ctx) return;
    if (!this.isRunning(ctx)) {
      this.pending.push(notes);
      void this.unlock();
      return;
    }
    this.schedule(ctx, notes);
  }

  private schedule(ctx: AudioContext, notes: Tone[]) {
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.type ?? "sine";
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.at);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + note.at);
      gain.gain.exponentialRampToValueAtTime(note.vol ?? 0.26, ctx.currentTime + note.at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + note.at + note.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + note.at);
      osc.stop(ctx.currentTime + note.at + note.dur + 0.05);
    }
  }

  click() {
    this.play([{ freq: 520, at: 0, dur: 0.08, type: "triangle", vol: 0.14 }]);
  }

  keypad() {
    this.play([{ freq: 740, at: 0, dur: 0.05, type: "triangle", vol: 0.09 }]);
  }

  correct() {
    this.play([
      { freq: 660, at: 0, dur: 0.12 },
      { freq: 880, at: 0.1, dur: 0.24 },
    ]);
  }

  wrong() {
    this.play([
      { freq: 180, at: 0, dur: 0.22, type: "sawtooth", vol: 0.16 },
      { freq: 140, at: 0.08, dur: 0.28, type: "sawtooth", vol: 0.13 },
    ]);
  }

  win() {
    this.play([
      { freq: 523, at: 0, dur: 0.14 },
      { freq: 659, at: 0.12, dur: 0.14 },
      { freq: 784, at: 0.24, dur: 0.14 },
      { freq: 1047, at: 0.38, dur: 0.5 },
    ]);
  }
}

export const sfx = new SoundFX();
