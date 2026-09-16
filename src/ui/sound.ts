interface Tone {
  freq: number;
  at: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
}

/** 用 WebAudio 合成的轻量音效，无需音频资源 */
class SoundFX {
  private ctx: AudioContext | null = null;

  unlock() {
    this.ensure();
  }

  private ensure(): AudioContext | null {
    try {
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private play(notes: Tone[]) {
    const ctx = this.ensure();
    if (!ctx) return;
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.type ?? "sine";
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.at);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + note.at);
      gain.gain.exponentialRampToValueAtTime(note.vol ?? 0.18, ctx.currentTime + note.at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + note.at + note.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + note.at);
      osc.stop(ctx.currentTime + note.at + note.dur + 0.05);
    }
  }

  click() {
    this.play([{ freq: 520, at: 0, dur: 0.08, type: "triangle", vol: 0.08 }]);
  }

  correct() {
    this.play([
      { freq: 660, at: 0, dur: 0.12 },
      { freq: 880, at: 0.1, dur: 0.24 },
    ]);
  }

  wrong() {
    this.play([
      { freq: 180, at: 0, dur: 0.22, type: "sawtooth", vol: 0.1 },
      { freq: 140, at: 0.08, dur: 0.28, type: "sawtooth", vol: 0.08 },
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
