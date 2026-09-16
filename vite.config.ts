import { defineConfig } from "vite";

export default defineConfig({
  // 让构建产物可部署在 GitHub Pages 的仓库子路径或任意静态目录下。
  base: "./",
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
