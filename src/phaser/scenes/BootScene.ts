import Phaser from "phaser";
import { markBooted } from "../gameManager";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    this.scene.start(markBooted());
  }
}
