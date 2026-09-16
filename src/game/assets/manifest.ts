/**
 * 稳定资源清单。
 * 当前 MVP 全部使用 DOM/CSS 与程序化粒子，无二进制资源；
 * 后续引入图片、音效或字体时在此登记稳定 key，避免在玩法代码里直接写路径。
 */
export const AssetManifest = {
  ui: {},
  audio: {},
  fx: {
    dot: "fx-dot",
  },
} as const;
