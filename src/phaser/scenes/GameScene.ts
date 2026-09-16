import Phaser from "phaser";
import { sceneBridge } from "../adapters/sceneBridge";
import { FloatingBackground } from "../view/floating";

const CONFETTI_COLORS = [0xfbbf24, 0xf472b6, 0x38bdf8, 0xa78bfa, 0x4ade80];
const CORRECT_COLORS = [0x34d399, 0x4ade80, 0xfbbf24];

export class GameScene extends Phaser.Scene {
  private background!: FloatingBackground;

  constructor() {
    super("GameScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b1220");
    this.background = new FloatingBackground(this, CONFETTI_COLORS, 24);
    this.ensureDotTexture();

    sceneBridge.on("fx-correct", this.onCorrect, this);
    sceneBridge.on("fx-wrong", this.onWrong, this);
    sceneBridge.on("fx-win", this.onWin, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      sceneBridge.off("fx-correct", this.onCorrect, this);
      sceneBridge.off("fx-wrong", this.onWrong, this);
      sceneBridge.off("fx-win", this.onWin, this);
    });
  }

  update(time: number, delta: number) {
    this.background.update(time, delta);
  }

  private ensureDotTexture() {
    if (!this.textures.exists("fx-dot")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(5, 5, 5);
      g.generateTexture("fx-dot", 10, 10);
      g.destroy();
    }
  }

  private burst(x: number, y: number, colors: number[], count: number, power: number) {
    for (const tint of colors) {
      this.add.particles(x, y, "fx-dot", {
        speed: { min: power * 0.45, max: power },
        angle: { min: 0, max: 360 },
        lifespan: { min: 500, max: 1000 },
        gravityY: 320,
        scale: { start: 1.1, end: 0 },
        tint,
        emitting: false,
      }).explode(count);
    }
  }

  private onCorrect(_payload: { a: number; b: number }) {
    this.burst(this.scale.width / 2, this.scale.height * 0.42, CORRECT_COLORS, 12, 280);
  }

  private onWrong(_payload: { a: number; b: number }) {
    this.cameras.main.shake(140, 0.006);
  }

  private onWin(_payload: { score: number }) {
    this.burst(this.scale.width / 2, this.scale.height * 0.3, CONFETTI_COLORS, 70, 520);
    for (let i = 1; i <= 8; i++) {
      this.time.delayedCall(i * 140, () => {
        this.burst(Math.random() * this.scale.width, -10, CONFETTI_COLORS, 16, 380);
      });
    }
  }
}
