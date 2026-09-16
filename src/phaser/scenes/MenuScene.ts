import Phaser from "phaser";
import { FloatingBackground } from "../view/floating";

export class MenuScene extends Phaser.Scene {
  private background!: FloatingBackground;

  constructor() {
    super("MenuScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b1220");
    this.background = new FloatingBackground(
      this,
      [0x38bdf8, 0x34d399, 0xfbbf24, 0xf472b6, 0xa78bfa],
      26,
    );
  }

  update(time: number, delta: number) {
    this.background.update(time, delta);
  }
}
