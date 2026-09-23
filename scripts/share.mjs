#!/usr/bin/env node
/**
 * 一键把游戏分享到手机：
 *   1. 先在同一个 WiFi 下启动本地服务；
 *   2. 打印出局域网地址，并画出二维码；
 *   3. 手机扫码即可打开，按提示"添加到主屏幕"即可当 App 用。
 *
 * 用法：npm run share
 */

import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import { createServer } from "node:net";
import QRCode from "qrcode";

const PORT = 4173;

/** 找出本机在局域网里的 IPv4 地址（手机要通过这个地址访问） */
function lanAddresses() {
  const out = [];
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      // 跳过虚拟网卡（Docker / 虚拟机常用 198.18、172.16~31 等网段）
      if (/^(198\.18\.|192\.168\.64\.|100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.)/.test(addr.address)) continue;
      out.push({ name, address: addr.address });
    }
  }
  // 常见的家用网段优先显示
  return out.sort((a, b) => {
    const score = (x) => (/^192\.168\./.test(x) ? 0 : /^10\./.test(x) ? 1 : 2);
    return score(a.address) - score(b.address);
  });
}

function portInUse(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => server.close(() => resolve(false)));
    server.listen(port, "127.0.0.1");
  });
}

async function main() {
  const addresses = lanAddresses();
  if (addresses.length === 0) {
    console.log("⚠️  没有找到局域网地址。请确认电脑已连上 WiFi 或网线。");
  }

  const busy = await portInUse(PORT);
  if (busy) {
    console.log(`⚠️  端口 ${PORT} 已被占用，如果之前已经启动过服务，直接用下面的地址即可。`);
  } else {
    console.log("正在启动本地服务…\n");
    const child = spawn("npx", ["vite", "preview", "--host", "--port", String(PORT)], {
      stdio: ["ignore", "ignore", "inherit"],
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => process.exit(code ?? 0));
    await new Promise((r) => setTimeout(r, 2500));
  }

  if (addresses.length === 0) return;

  const primary = addresses[0];
  const url = `http://${primary.address}:${PORT}/`;

  console.log("═".repeat(50));
  console.log("手机和这台电脑连上同一个 WiFi，然后扫码或输入网址：");
  console.log("");
  console.log(`   👉  ${url}`);
  console.log("");
  console.log(await QRCode.toString(url, { type: "terminal", small: true }));
  console.log("在手机上打开后：");
  console.log("  iPhone：点底部分享按钮 → 添加到主屏幕");
  console.log("  Android：点右上角菜单 → 安装应用 / 添加到主屏幕");
  console.log("装好后即使断网也能打开，进度存在各自手机里。");
  if (addresses.length > 1) {
    console.log("");
    console.log("如果上面这个地址连不上，可以试：");
    addresses.slice(1).forEach((a) => console.log(`   http://${a.address}:${PORT}/  (${a.name})`));
  }
  console.log("═".repeat(50));
  console.log("按 Ctrl+C 停止服务。");
}

main().catch((err) => {
  console.error("启动失败：", err.message);
  process.exit(1);
});
