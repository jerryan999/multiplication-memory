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
    let refreshedForUpdate = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshedForUpdate) {
        refreshedForUpdate = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => registration.update())
      .catch((error: unknown) => {
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

  // 在捕获阶段解锁，避免 iOS Safari 在点击处理完成后拒绝播放音效。
  const unlock = () => void sfx.unlock();
  document.addEventListener("pointerdown", unlock, { capture: true, once: true });
  document.addEventListener("keydown", unlock, { capture: true, once: true });
});
