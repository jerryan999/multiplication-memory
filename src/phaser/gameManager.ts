import Phaser from "phaser";

let game: Phaser.Game | null = null;

export function initGame(config: Phaser.Types.Core.GameConfig) {
  game = new Phaser.Game(config);
}

export function startRoundScene() {
  game?.scene.start("GameScene");
}

export function backToMenu() {
  game?.scene.start("MenuScene");
}
