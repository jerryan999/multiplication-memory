import "./style.css";
import Phaser from "phaser";
import { initGame } from "./phaser/gameManager";
import { BootScene } from "./phaser/scenes/BootScene";
import { MenuScene } from "./phaser/scenes/MenuScene";
import { GameScene } from "./phaser/scenes/GameScene";
import { App } from "./ui/app";
import { sfx } from "./ui/sound";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error: unknown) => {
      console.warn("PWA offline cache registration failed", error);
    });
  });
}

window.addEventListener("DOMContentLoaded", () => {
  initGame({
    type: Phaser.AUTO,
    parent: "game-container",
    backgroundColor: "#0b1220",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: "100%",
      height: "100%",
    },
    scene: [BootScene, MenuScene, GameScene],
  });

  const appRoot = document.getElementById("app");
  if (appRoot) new App(appRoot).init();

  // 首次交互时解锁音频（满足浏览器自动播放策略）
  const unlock = () => sfx.unlock();
  document.addEventListener("pointerdown", unlock, { once: true });
  document.addEventListener("keydown", unlock, { once: true });
});
