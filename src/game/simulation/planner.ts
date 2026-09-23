import { FACTS, type Fact } from "../content/facts";
import { getProgress, MASTERED_STAGE, type FactProgress } from "./mastery";
import { mulberry32, shuffle, type RNG } from "./questions";
import { getSettings } from "./settings";

export interface Plan {
  facts: Fact[];
  reviewCount: number;
  newCount: number;
}

interface Scored {
  fact: Fact;
  progress: FactProgress;
}

/**
 * 每轮最多引入多少条全新口诀。
 * 上限是为了给"正在练习中"的口诀留出位置：
 * 一条新口诀答对后进入"练习中"，必须再考一次才能升到"已掌握"，
 * 如果每轮都优先抽更新的口诀，它永远等不到第二次机会，
 * 孩子的进度就会一直卡在 0。
 */
const NEW_PER_ROUND = 4;

/**
 * 新口诀的抽取权重：越靠前的行越容易被抽到，但不是固定顺序。
 * 1 的行权重约 4.0，9 的行约 0.44 —— 前期仍从简单口诀起步，
 * 具体抽到哪几条则由随机决定，不再是从小到大一条条来。
 */
function freshWeight(fact: Fact): number {
  return 4 / (fact.a + fact.b * 0.25);
}

/** 复习权重：错得越多、阶段越低，越该被抽到 */
function reviewWeight(item: Scored): number {
  const stageBoost = (MASTERED_STAGE - item.progress.stage + 1) ** 2;
  const wrongBoost = 1 + Math.min(item.progress.wrong, 5) * 0.6;
  return stageBoost * wrongBoost;
}

/**
 * 按权重随机取前 n 个（Efraimidis-Spirakis 算法）。
 * 权重只影响概率，不会锁死顺序——这正是"有倾向的随机"。
 */
function weightedPick<T>(items: T[], weightOf: (item: T) => number, n: number, rng: RNG): T[] {
  if (n <= 0) return [];
  return items
    .map((item) => {
      const w = Math.max(0.0001, weightOf(item));
      return { item, key: Math.pow(rng(), 1 / w) };
    })
    .sort((x, y) => y.key - x.key)
    .slice(0, n)
    .map((entry) => entry.item);
}

function scored(): Scored[] {
  return FACTS.map((fact) => ({ fact, progress: getProgress(fact.key) }));
}

/**
 * 智能抽题：先安排到期的复习，再推动"练习中"的口诀，最后引入少量新口诀。
 *
 * 三档之间是优先级关系，但每一档内部按权重随机——
 * 既保证薄弱项被照顾到，又让孩子无法靠记住顺序来应付。
 */
export function buildSmartPlan(now = Date.now(), rng: RNG = mulberry32(Date.now() >>> 0)): Plan {
  const limit = getSettings().questionsPerRound;
  const all = scored();
  const chosen: Fact[] = [];
  const has = (f: Fact) => chosen.some((c) => c.key === f.key);
  const take = (items: Fact[]) => {
    for (const fact of items) {
      if (chosen.length >= limit) return;
      if (!has(fact)) chosen.push(fact);
    }
  };

  // 1. 到期的复习：学过但还没掌握、且已经到了复习时间
  const due = all.filter(
    (s) => s.progress.stage >= 1 && s.progress.stage < MASTERED_STAGE && s.progress.dueAt <= now,
  );
  take(weightedPick(due, reviewWeight, limit, rng).map((s) => s.fact));
  const reviewCount = chosen.length;

  // 2. 练习中：还没到复习时间，但需要再考一次才能升到"已掌握"
  const reserveForNew = Math.min(NEW_PER_ROUND, Math.max(0, limit - chosen.length));
  const inProgress = all.filter(
    (s) => s.progress.stage >= 1 && s.progress.stage < MASTERED_STAGE && !has(s.fact),
  );
  take(
    weightedPick(inProgress, reviewWeight, limit - reserveForNew - chosen.length, rng).map((s) => s.fact),
  );

  // 3. 新口诀：按权重随机抽取，保证前期以简单行居多但不是固定顺序
  const fresh = all.filter((s) => s.progress.stage === 0);
  take(weightedPick(fresh, (s) => freshWeight(s.fact), limit - chosen.length, rng).map((s) => s.fact));
  const newCount = chosen.length - reviewCount;

  // 4. 还不够就用最薄弱的补满
  if (chosen.length < limit) {
    const rest = all.filter((s) => !has(s.fact) && s.progress.stage < MASTERED_STAGE);
    take(weightedPick(rest, reviewWeight, limit - chosen.length, rng).map((s) => s.fact));
  }

  /*
   * 5. 45 条全部掌握时上面都选不出题，抽一批最久没练的做巩固。
   */
  if (chosen.length === 0) {
    const mastered = all.filter((s) => s.progress.stage >= MASTERED_STAGE);
    const picked = weightedPick(
      mastered,
      (s) => 1 + (now - s.progress.lastSeen) / (24 * 60 * 60 * 1000),
      limit,
      rng,
    );
    return { facts: shuffle(picked.map((s) => s.fact), rng), reviewCount: picked.length, newCount: 0 };
  }

  // 最后打乱出场顺序：题目顺序本身也不许有规律
  return { facts: shuffle(chosen, rng), reviewCount, newCount };
}

export function planLabel(plan: Plan): string {
  if (plan.newCount > 0 && plan.reviewCount > 0) {
    return `复习 ${plan.reviewCount} 条 · 新口诀 ${plan.newCount} 条`;
  }
  if (plan.newCount > 0) return `新口诀 ${plan.newCount} 条`;
  return `复习 ${plan.reviewCount} 条口诀`;
}
