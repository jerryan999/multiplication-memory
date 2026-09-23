import Phaser from "phaser";

let game: Phaser.Game | null = null;
let booted = false;
let pendingScene = "MenuScene";

export function initGame(config: Phaser.Types.Core.GameConfig) {
  game = new Phaser.Game(config);
}

/** BootScene 就绪前发起的场景请求会先入队，避免被默认背景场景顶掉 */
export function startRoundScene() {
  if (booted) game?.scene.start("GameScene");
  else pendingScene = "GameScene";
}

export function backToMenu() {
  pendingScene = "MenuScene";
  game?.scene.start("MenuScene");
}

/** 由 BootScene 调用：标记就绪并消费队列中的首个场景 */
export function markBooted(): string {
  booted = true;
  return pendingScene;
}
