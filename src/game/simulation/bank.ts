import { makeQuestion, type Question } from "./questions";

interface BankEntry {
  a: number;
  b: number;
  misses: number;
}

const STORAGE_KEY = "jiujiu-memory-bank:v1";

function load(): Map<string, BankEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, BankEntry>;
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

function save(map: Map<string, BankEntry>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(map)));
  } catch {
    // localStorage 不可用时静默降级（如隐私模式）
  }
}

/** 答错时把题目记入错题本，错得越多权重越高 */
export function bumpBank(a: number, b: number) {
  const map = load();
  const key = `${a}x${b}`;
  const entry = map.get(key) ?? { a, b, misses: 0 };
  entry.misses += 1;
  map.set(key, entry);
  save(map);
}

/** 答对后从错题本清除 */
export function clearBank(a: number, b: number) {
  const map = load();
  if (map.delete(`${a}x${b}`)) save(map);
}

/** 从错题本中挑出当前关卡范围内、错得最多的若干题 */
export function pickBankQuestions(rows: number[], max: number): Question[] {
  const map = load();
  return [...map.values()]
    .filter((e) => rows.includes(e.a))
    .sort((x, y) => y.misses - x.misses || x.a - y.a || x.b - y.b)
    .slice(0, max)
    .map((e) => makeQuestion(e.a, e.b));
}

export function bankSize(): number {
  return load().size;
}
