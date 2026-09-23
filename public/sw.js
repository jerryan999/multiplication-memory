const CACHE_NAME = "multiplication-memory-v4";

/**
 * 除了首页引用的资源，还要缓存 PWA 图标。
 * 图标只写在 manifest 里，不会被首页的 link 扫描到；
 * 若漏掉，装到主屏后断网可能出现空白图标。
 */
const EXTRA_PRECACHE = [
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

async function cacheAppShell() {
  const indexResponse = await fetch("./index.html", { cache: "reload" });
  const index = await indexResponse.text();
  const assetUrls = [...index.matchAll(/(?:src|href)="([^"#]+)"/g)]
    .map((match) => match[1])
    .filter((url) => url.startsWith("./"));
  const appShell = [...new Set(["./", "./index.html", ...assetUrls, ...EXTRA_PRECACHE])];
  const cache = await caches.open(CACHE_NAME);
  // 单个资源失败（例如某个图标路径写错）不应让整个安装失败
  await Promise.all(
    appShell.map((url) => cache.add(url).catch(() => undefined)),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;

  /*
   * 页面导航走网络优先：先拿最新 HTML，断网时才回退到缓存。
   * 若沿用"缓存优先"，旧页面会被一直喂给浏览器，更新永远进不来。
   */
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(async () => (await caches.match("./index.html")) || (await caches.match("./")) || Response.error()),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch (error) {
        throw error;
      }
    }),
  );
});
