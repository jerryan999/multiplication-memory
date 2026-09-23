import type { Fact } from "../content/facts";
import type { Stage } from "./mastery";

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

/**
 * 题型，难度递增：
 * - choice  四选一（初学，先认识）
 * - input   看算式直接填答案（要求回忆出来）
 * - missing 缺项填空，如 7 × ? = 56（要求真正记住）
 */
export type QuestionKind = "choice" | "input" | "missing";

export interface Question {
  fact: Fact;
  kind: QuestionKind;
  /** 等号左侧两个位置，空字符串表示待填 */
  left: string;
  right: string;
  /** 等号右侧，空字符串表示待填 */
  result: string;
  /** 需要作答的数字 */
  expected: number;
  options: number[];
  hint: string;
  /** 需要填的是积还是一个因数 */
  target: "product" | "factor";
}

/** 干扰项取同一行、同一列的其他积——这些正是孩子真正会混的邻近口诀 */
function buildOptions(fact: Fact, rng: RNG): number[] {
  const pool = new Set<number>();
  for (let k = 1; k <= 9; k++) {
    pool.add(fact.a * k);
    pool.add(fact.b * k);
  }
  pool.delete(fact.product);

  const candidates = shuffle([...pool].filter((v) => v >= 1 && v <= 81), rng);
  const picked: number[] = [];

  // 先挑一个相邻的积（最容易混），再随机补两个
  const neighbour = candidates.find((v) => Math.abs(v - fact.product) <= 9) ?? candidates[0];
  if (neighbour !== undefined) picked.push(neighbour);
  for (const v of candidates) {
    if (picked.length >= 3) break;
    if (!picked.includes(v)) picked.push(v);
  }

  return shuffle([...picked, fact.product], rng);
}

function kindForStage(stage: Stage, rng: RNG): QuestionKind {
  if (stage <= 1) return "choice";
  if (stage === 2) return "input";
  return rng() < 0.35 ? "missing" : "input";
}

/** 按掌握阶段生成一道题：越熟练，越要求自己背出来 */
export function makeQuestion(fact: Fact, stage: Stage, rng: RNG): Question {
  const kind = kindForStage(stage, rng);
  /*
   * 因数的前后顺序也随机：3×7 和 7×3 都要认得，
   * 否则孩子可能只记住"小的在前"这一个固定写法。
   */
  const flipped = rng() < 0.5;
  const first = flipped ? fact.b : fact.a;
  const second = flipped ? fact.a : fact.b;

  if (kind === "choice") {
    return {
      fact,
      kind,
      left: String(first),
      right: String(second),
      result: "",
      expected: fact.product,
      options: buildOptions(fact, rng),
      hint: "选一个正确答案",
      target: "product",
    };
  }

  if (kind === "input") {
    return {
      fact,
      kind,
      left: String(first),
      right: String(second),
      result: "",
      expected: fact.product,
      options: [],
      hint: "不看选项，自己算出答案",
      target: "product",
    };
  }

  // 缺项填空：藏起一个因数，同样保留上面随机好的前后顺序
  const hideRight = rng() < 0.5;
  return {
    fact,
    kind,
    left: hideRight ? String(first) : "?",
    right: hideRight ? "?" : String(second),
    result: String(fact.product),
    expected: hideRight ? second : first,
    options: [],
    hint: "想一想：口诀里的另一个数是多少？",
    target: "factor",
  };
}

export function isCorrect(question: Question, value: number): boolean {
  return value === question.expected;
}
