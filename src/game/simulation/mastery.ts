import { FACTS, factFromKey, type Fact } from "../content/facts";

/**
 * 一条口诀的掌握进度（唯一事实来源）。
 * 0 未学 → 1 刚学过 → 2 练习中 → 3 已掌握 → 4 很牢固
 */
export type Stage = 0 | 1 | 2 | 3 | 4;

export interface FactProgress {
  stage: Stage;
  seen: number;
  correct: number;
  wrong: number;
  firstTryCorrect: number;
  lastSeen: number;
  /** 下次该复习的时间戳 */
  dueAt: number;
  /** 最近一次答错时选的值（用于看出混淆哪条口诀） */
  lastWrongValue?: number;
  /** 最近一次答错的时间戳 */
  lastWrongAt?: number;
}

const STORAGE_KEY = "jiujiu-mastery:v2";

export const MAX_STAGE: Stage = 4;
/** 达到这个阶段算"已掌握" */
export const MASTERED_STAGE: Stage = 3;

/**
 * 答对后进入新阶段时的下次复习间隔。
 * 阶段 1 定为 0：刚学会的口诀在同一轮里可以马上再巩固一次；
 * 阶段 2 起拉开到半小时、一天、三天，形成跨天复习。
 */
const REVIEW_INTERVAL_MS = [0, 0, 30 * 60 * 1000, 24 * 60 * 60 * 1000, 3 * 24 * 60 * 60 * 1000];

export const STAGE_LABEL: Record<Stage, string> = {
  0: "未学",
  1: "刚学过",
  2: "练习中",
  3: "已掌握",
  4: "很牢固",
};

export const STAGE_COLOR: Record<Stage, string> = {
  0: "#475569",
  1: "#fb923c",
  2: "#fbbf24",
  3: "#34d399",
  4: "#10b981",
};

export function emptyProgress(): FactProgress {
  return {
    stage: 0,
    seen: 0,
    correct: 0,
    wrong: 0,
    firstTryCorrect: 0,
    lastSeen: 0,
    dueAt: 0,
  };
}

function loadAll(): Map<string, FactProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, FactProgress>;
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

function saveAll(map: Map<string, FactProgress>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(map)));
  } catch {
    // 隐私模式下 localStorage 不可用时静默降级
  }
}

export function getProgress(key: string): FactProgress {
  return loadAll().get(key) ?? emptyProgress();
}

export function getAllProgress(): Map<string, FactProgress> {
  return loadAll();
}

export interface StageChange {
  before: Stage;
  after: Stage;
  newlyMastered: boolean;
}

/**
 * 一次作答的结果。
 * 超时单独区分于答错：超时往往是"在犹豫、在推算"，而不是"完全不知道"，
 * 惩罚力度按此区分，避免因为手慢就大幅退步，打击孩子。
 */
export type AnswerOutcome = "correct" | "wrong" | "timeout";

/** 记录一次作答，返回阶段变化 */
export function recordAnswer(
  key: string,
  outcome: AnswerOutcome,
  firstTry: boolean,
  pickedValue?: number,
): StageChange {
  const map = loadAll();
  const current = map.get(key) ?? emptyProgress();
  const before = current.stage;
  const now = Date.now();
  let stage = before;
  const isCorrect = outcome === "correct";

  if (isCorrect) {
    /*
     * 只有第一次就答对，才说明真的记住了，才推进阶段。
     *
     * 阶段 0 是新口诀第一次遇到，直接给 +2（到"练习中"）：
     * 现在没有学习环节，上来就考，第一次就答对已经是有力信号；
     * 但仍要求再答对一次（阶段 2 → 3）才算"已掌握"，
     * 因为首题是四选一，存在猜对的可能，一步到位不够诚实。
     * 答错会一次退两级，虚高的进度很快会被纠正回来。
     */
    if (firstTry && stage < MAX_STAGE) {
      stage = Math.min(MAX_STAGE, stage + (stage === 0 ? 2 : 1)) as Stage;
      current.firstTryCorrect += 1;
    }
  } else if (outcome === "timeout") {
    // 没在规定时间内答出来：退一级，比答错轻
    stage = Math.max(0, stage - 1) as Stage;
  } else {
    // 答错说明还没记住，退回需要重新练习的阶段
    stage = Math.max(0, stage - 2) as Stage;
  }

  /*
   * 只要答过一道题，这条口诀至少算"见过"（阶段 ≥ 1），不再回到阶段 0。
   *
   * 阶段 0 表示"还没见过"，但孩子答完就已经看过正确口诀了。
   * 更要紧的是抽题逻辑：阶段 0 属于"新口诀"池，每轮只有少量名额、按权重随机抽；
   * 若刚答错的题被退回阶段 0，它就要和新口诀抢名额，
   * 导致"上一轮错的题下一轮不一定考得到"，复习落空。
   */
  stage = Math.max(1, stage) as Stage;

  const updated: FactProgress = {
    ...current,
    stage,
    seen: current.seen + 1,
    correct: current.correct + (isCorrect ? 1 : 0),
    wrong: current.wrong + (isCorrect ? 0 : 1),
    lastSeen: now,
    dueAt: isCorrect ? now + REVIEW_INTERVAL_MS[stage] : now,
    // 记下错成了什么，错题本才不只是"错了几次"，而是能看出混淆了哪条口诀
    ...(isCorrect
      ? {}
      : { lastWrongValue: pickedValue ?? -1, lastWrongAt: now }),
  };
  map.set(key, updated);
  saveAll(map);

  return {
    before,
    after: stage,
    newlyMastered: before < MASTERED_STAGE && stage >= MASTERED_STAGE,
  };
}

export interface MasteryStats {
  mastered: number;
  learning: number;
  fresh: number;
  total: number;
  dueNow: number;
  dueNowFacts: Fact[];
}

export function masteryStats(now = Date.now()): MasteryStats {
  const map = loadAll();
  let mastered = 0;
  let learning = 0;
  const dueNowFacts: Fact[] = [];

  for (const fact of FACTS) {
    const progress = map.get(fact.key) ?? emptyProgress();
    if (progress.stage >= MASTERED_STAGE) mastered += 1;
    else if (progress.stage >= 1) learning += 1;
    if (progress.stage >= 1 && progress.stage < MASTERED_STAGE && progress.dueAt <= now) {
      dueNowFacts.push(fact);
    }
  }

  return {
    mastered,
    learning,
    fresh: FACTS.length - mastered - learning,
    total: FACTS.length,
    dueNow: dueNowFacts.length,
    dueNowFacts,
  };
}

export function factOf(key: string): Fact | undefined {
  return factFromKey(key);
}
