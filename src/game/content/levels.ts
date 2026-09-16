export type LevelId = number | "mixed";

export interface LevelConfig {
  id: LevelId;
  title: string;
  subtitle: string;
  rows: number[];
  questionCount: number;
  color: string;
}

export const LEVELS: LevelConfig[] = [
  { id: 1, title: "1 的乘法", subtitle: "一一得一，热身起步", rows: [1], questionCount: 9, color: "#38bdf8" },
  { id: 2, title: "2 的乘法", subtitle: "双倍速成长", rows: [2], questionCount: 9, color: "#34d399" },
  { id: 3, title: "3 的乘法", subtitle: "三个三个数", rows: [3], questionCount: 9, color: "#fbbf24" },
  { id: 4, title: "4 的乘法", subtitle: "四方小将", rows: [4], questionCount: 9, color: "#fb923c" },
  { id: 5, title: "5 的乘法", subtitle: "五五二十五", rows: [5], questionCount: 9, color: "#f472b6" },
  { id: 6, title: "6 的乘法", subtitle: "六六三十六", rows: [6], questionCount: 9, color: "#a78bfa" },
  { id: 7, title: "7 的乘法", subtitle: "七七四十九", rows: [7], questionCount: 9, color: "#22d3ee" },
  { id: 8, title: "8 的乘法", subtitle: "八八六十四", rows: [8], questionCount: 9, color: "#f87171" },
  { id: 9, title: "9 的乘法", subtitle: "九九八十一", rows: [9], questionCount: 9, color: "#4ade80" },
  { id: "mixed", title: "混合挑战", subtitle: "2~9 随机抽考", rows: [2, 3, 4, 5, 6, 7, 8, 9], questionCount: 12, color: "#e879f9" },
];

export function getLevel(id: LevelId): LevelConfig {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}
