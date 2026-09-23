/**
 * 九九乘法口诀表（小九九）内容层，项目内唯一内容来源。
 * 传统口诀表是 45 条：只保留较小因数在前，如"二三得六"。
 * "三二得六"不是另一条口诀，所以 2×7 与 7×2 是同一条。
 */

export interface Fact {
  /** 较小因数 */
  a: number;
  /** 较大因数 */
  b: number;
  product: number;
  key: string;
  /** 口诀，如"三七二十一" */
  koujue: string;
}

export interface RowMeta {
  row: number;
  title: string;
  subtitle: string;
  color: string;
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

/** 生成口诀：3×7 -> "三七二十一"，2×3 -> "二三得六" */
export function toKouJue(a: number, b: number): string {
  const [small, big] = a <= b ? [a, b] : [b, a];
  const product = small * big;
  const head = `${DIGITS[small]}${DIGITS[big]}`;
  return product < 10 ? `${head}得${DIGITS[product]}` : `${head}${toChineseNumber(product)}`;
}

/** 因数的规范顺序：小的在前 */
export function canonical(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a];
}

export function factKey(a: number, b: number): string {
  const [x, y] = canonical(a, b);
  return `${x}x${y}`;
}

function makeFact(a: number, b: number): Fact {
  return {
    a,
    b,
    product: a * b,
    key: `${a}x${b}`,
    koujue: toKouJue(a, b),
  };
}

/** 全部 45 条口诀，按口诀表顺序（1 的行 → 9 的行） */
export const FACTS: Fact[] = (() => {
  const list: Fact[] = [];
  for (let a = 1; a <= 9; a++) {
    for (let b = a; b <= 9; b++) list.push(makeFact(a, b));
  }
  return list;
})();

export const FACTS_BY_KEY: Map<string, Fact> = new Map(FACTS.map((f) => [f.key, f]));

/** ROW_FACTS[n] 是第 n 行的全部口诀 */
export const ROW_FACTS: Fact[][] = (() => {
  const rows: Fact[][] = Array.from({ length: 10 }, () => [] as Fact[]);
  for (const fact of FACTS) rows[fact.a].push(fact);
  return rows;
})();

export const ROW_META: RowMeta[] = [
  { row: 0, title: "", subtitle: "", color: "#64748b" },
  { row: 1, title: "1 的口诀", subtitle: "一一得一，热身起步", color: "#38bdf8" },
  { row: 2, title: "2 的口诀", subtitle: "一二得二、二二得四", color: "#34d399" },
  { row: 3, title: "3 的口诀", subtitle: "三三得九，三个三个数", color: "#fbbf24" },
  { row: 4, title: "4 的口诀", subtitle: "四四十六、四五二十", color: "#fb923c" },
  { row: 5, title: "5 的口诀", subtitle: "五五二十五，最好记", color: "#f472b6" },
  { row: 6, title: "6 的口诀", subtitle: "六六三十六", color: "#a78bfa" },
  { row: 7, title: "7 的口诀", subtitle: "七七四十九，要小心", color: "#22d3ee" },
  { row: 8, title: "8 的口诀", subtitle: "八八六十四", color: "#f87171" },
  { row: 9, title: "9 的口诀", subtitle: "九九八十一，最后一关", color: "#4ade80" },
];

export function rowMeta(row: number): RowMeta {
  return ROW_META[row] ?? ROW_META[1];
}

export function factFromKey(key: string): Fact | undefined {
  return FACTS_BY_KEY.get(key);
}

export const TOTAL_FACTS = FACTS.length;
