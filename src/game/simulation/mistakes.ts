import { FACTS, type Fact } from "../content/facts";
import {
  getAllProgress,
  MASTERED_STAGE,
  emptyProgress,
  STAGE_LABEL,
  type FactProgress,
  type Stage,
} from "./mastery";

export interface MistakeRecord {
  fact: Fact;
  progress: FactProgress;
  /** 错了几次 */
  wrongCount: number;
  /** 最近一次错成了什么；-1 表示超时没答 */
  lastWrongValue: number;
  lastWrongAt: number;
  /** 是否已经重新练到掌握 */
  recovered: boolean;
  /** 混淆提示：错的答案正好是另一条口诀的积时给出那条口诀 */
  confusedWith: Fact | null;
  /** 口诀里包含该数（用于解释为什么像） */
  confusedByProduct: boolean;
}

/**
 * 推断"孩子可能把哪条口诀记混了"。
 *
 * 只找错的这个数对应的积里、**与原题共用至少一个因数**的那些口诀。
 * 光看"积相等"会产生大量巧合误报——例如 3×3 答成 18，
 * 18 恰好是 2×9 的积，但两者毫无关系，这种提示只会误导人。
 * 若没有共用因数的候选，就宁可不给提示。
 */
function findConfusion(fact: Fact, wrongValue: number): Fact | null {
  if (wrongValue <= 0) return null;
  const candidates = FACTS.filter(
    (f) => f.product === wrongValue && f.key !== fact.key,
  ).filter((f) => f.a === fact.a || f.a === fact.b || f.b === fact.a || f.b === fact.b);
  if (candidates.length === 0) return null;

  // 多个候选时，取因数差别最小的那条（差别越小越像记混）
  return candidates.sort((x, y) => {
    const diff = (f: Fact) =>
      Math.abs(f.a - fact.a) + Math.abs(f.b - fact.b) + Math.abs(f.a - fact.b) + Math.abs(f.b - fact.a);
    return diff(x) - diff(y);
  })[0];
}

/** 汇总全部错题：只要有答错记录就进错题本，不论现在是否已经练会 */
export function collectMistakes(): MistakeRecord[] {
  const progressMap = getAllProgress();
  const records: MistakeRecord[] = [];

  for (const fact of FACTS) {
    const progress = progressMap.get(fact.key) ?? emptyProgress();
    if (progress.wrong <= 0) continue;

    const stage = progress.stage as Stage;
    const lastWrongValue = progress.lastWrongValue ?? -1;
    const confusedWith = findConfusion(fact, lastWrongValue);

    records.push({
      fact,
      progress,
      wrongCount: progress.wrong,
      lastWrongValue,
      lastWrongAt: progress.lastWrongAt ?? progress.lastSeen,
      recovered: stage >= MASTERED_STAGE,
      confusedWith,
      confusedByProduct: confusedWith !== null,
    });
  }

  // 错得多的排前面；一样多则最近错的排前面
  return records.sort(
    (x, y) => y.wrongCount - x.wrongCount || y.lastWrongAt - x.lastWrongAt,
  );
}

export interface MistakeSummary {
  /** 有错题记录的口诀总数 */
  total: number;
  /** 其中还没重新掌握的 */
  unresolved: number;
  /** 已经重新练会的 */
  recovered: number;
  /** 超时导致的错题数 */
  timedOut: number;
}

export function summarizeMistakes(records: MistakeRecord[]): MistakeSummary {
  return {
    total: records.length,
    unresolved: records.filter((r) => !r.recovered).length,
    recovered: records.filter((r) => r.recovered).length,
    timedOut: records.filter((r) => r.lastWrongValue === -1).length,
  };
}

export function stageText(progress: FactProgress): string {
  return STAGE_LABEL[progress.stage as Stage];
}

/** 把时间戳转成"刚刚 / 3 分钟前 / 2 天前"这样的相对时间 */
export function relativeTime(at: number, now = Date.now()): string {
  if (!at) return "—";
  const diff = Math.max(0, now - at);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return `${Math.floor(days / 30)} 个月前`;
}
