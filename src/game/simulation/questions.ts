import type { LevelConfig } from "../content/levels";

export interface Question {
  a: number;
  b: number;
  answer: number;
  key: string;
  text: string;
}

export type RNG = () => number;

export function mulberry32(seed: number): RNG {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: readonly T[], rng: RNG): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function questionKey(a: number, b: number): string {
  return `${a}x${b}`;
}

export function makeQuestion(a: number, b: number): Question {
  return { a, b, answer: a * b, key: questionKey(a, b), text: `${a} × ${b}` };
}

const DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;

export function toChineseNumber(n: number): string {
  if (n < 10) return DIGITS[n];
  if (n === 10) return "十";
  if (n < 20) return `十${DIGITS[n % 10]}`;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones === 0 ? `${DIGITS[tens]}十` : `${DIGITS[tens]}十${DIGITS[ones]}`;
}

/** 生成口诀，如 3×7 -> "三七二十一"，2×3 -> "二三得六" */
export function toKouJue(a: number, b: number): string {
  const [small, big] = a <= b ? [a, b] : [b, a];
  const product = small * big;
  const head = `${DIGITS[small]}${DIGITS[big]}`;
  return product < 10 ? `${head}得${DIGITS[product]}` : `${head}${toChineseNumber(product)}`;
}

/** 生成一道题的 3 个干扰项 + 正确答案（乱序） */
export function generateOptions(q: Question, rng: RNG): number[] {
  const candidates = new Set<number>();

  // 优先用邻近乘法算式的积（最贴近真实错误的干扰项）
  for (const da of [0, 1, -1]) {
    for (const db of [0, 1, -1]) {
      const a = Math.max(1, Math.min(9, q.a + da));
      const b = Math.max(1, Math.min(9, q.b + db));
      const v = a * b;
      if (v !== q.answer && v >= 1 && v <= 81) candidates.add(v);
    }
  }

  // 不足时用 ± 偏移补足
  let offset = 1;
  while (candidates.size < 3 && offset <= 9) {
    for (const v of [q.answer + offset, q.answer - offset]) {
      if (v !== q.answer && v >= 1 && v <= 81 && !candidates.has(v)) candidates.add(v);
      if (candidates.size >= 3) break;
    }
    offset++;
  }

  const options = shuffle([...candidates], rng).slice(0, 3);
  options.push(q.answer);
  return shuffle(options, rng);
}

/** 按关卡生成一轮题目（乱序、去重） */
export function generateRound(level: LevelConfig, count: number, rng: RNG): Question[] {
  const pairs: Array<[number, number]> = [];
  for (const row of level.rows) {
    for (let b = 1; b <= 9; b++) pairs.push([row, b]);
  }
  return shuffle(pairs, rng)
    .slice(0, count)
    .map(([a, b]) => makeQuestion(a, b));
}
