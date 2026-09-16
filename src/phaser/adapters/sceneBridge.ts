interface EventMap {
  "fx-correct": { a: number; b: number };
  "fx-wrong": { a: number; b: number };
  "fx-win": { score: number };
}

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

interface Entry {
  fn: Function;
  bound: Function;
  ctx?: unknown;
}

/** 场景与 DOM UI 之间的轻量事件桥（只传渲染信号，不传游戏规则） */
class SceneBridge {
  private handlers = new Map<string, Entry[]>();

  on<K extends keyof EventMap>(event: K, fn: Handler<K>, ctx?: unknown) {
    let entries = this.handlers.get(event);
    if (!entries) {
      entries = [];
      this.handlers.set(event, entries);
    }
    entries.push({ fn, bound: ctx ? fn.bind(ctx) : fn, ctx });
  }

  off<K extends keyof EventMap>(event: K, fn: Handler<K>, ctx?: unknown) {
    const entries = this.handlers.get(event);
    if (!entries) return;
    const next = entries.filter((e) => !(e.fn === fn && e.ctx === ctx));
    if (next.length === 0) this.handlers.delete(event);
    else this.handlers.set(event, next);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
    const entries = this.handlers.get(event);
    if (!entries) return;
    for (const entry of [...entries]) entry.bound(payload);
  }
}

export const sceneBridge = new SceneBridge();
