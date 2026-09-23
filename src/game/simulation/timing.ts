import type { Stage } from "./mastery";
import { getSettings } from "./settings";

/**
 * 每题的答题时限（毫秒）。
 *
 * 按掌握阶段分两档，而不是所有题统一：
 * - 还没记牢的口诀要给足思考时间，否则孩子只是在被催促，不是在回忆；
 * - 已经掌握的口诀必须答得快，因为"脱口而出"才是背会的标志，
 *   如果给已掌握的口诀同样长的时间，孩子可以慢慢推算，练不出熟练度。
 *
 * 具体秒数由设置决定，家长可以按孩子的节奏调整。
 */
export function timeLimitForStage(stage: Stage): number {
  const { limitUnfamiliar, limitMastered } = getSettings();
  if (stage >= 3) return limitMastered * 1000;
  // 阶段 0~2（新遇到 / 刚答对一次 / 练习中）用宽松档
  return limitUnfamiliar * 1000;
}

/** 剩余时间进入这个比例后开始告警（变色并闪烁） */
export const WARN_RATIO = 0.3;
