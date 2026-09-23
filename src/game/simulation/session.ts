import type { Fact } from "../content/facts";
import { getProgress, recordAnswer, type AnswerOutcome, type Stage } from "./mastery";
import { timeLimitForStage } from "./timing";
import { isCorrect, makeQuestion, mulberry32, shuffle, type Question, type RNG } from "./questions";

export interface AnswerLog {
  question: Question;
  value: number;
  correct: boolean;
  /** 是否超时未答 */
  timeout: boolean;
  /** 本轮第一次就答对 */
  firstTry: boolean;
  stageBefore: Stage;
  stageAfter: Stage;
  newlyMastered: boolean;
  gained: number;
}

export interface SessionResult {
  /** 本轮实际出题数 */
  total: number;
  /** 答对的题数 */
  correctCount: number;
  /** 本轮答对后掌握阶段有提升的口诀数（含尚未到"已掌握"的） */
  advanced: number;
  newlyMastered: number;
  timeoutCount: number;
  /** 答错的题数 */
  wrongCount: number;
  score: number;
  bestStreak: number;
  stars: number;
  wrongKeys: string[];
}

/**
 * 一轮练习的会话状态（唯一事实来源）。
 *
 * 一轮的题数是固定的：出多少题就答多少题，答错不会追加新题。
 * （早先的版本会把错题插回队列重考，导致"20 题"实际要答 40 多道，
 * 与"每天练 20 道"的预期不符。）
 *
 * 答错的题改由掌握度机制接管：阶段退级、立即到期，
 * 下一轮会被优先抽到，所以仍然会复习到，只是不在本轮重复。
 */
export class PracticeSession {
  private queue: Fact[];
  private current: Question | null = null;
  private missed = new Set<string>();
  private logs: AnswerLog[] = [];
  private rng: RNG;
  private timeLimitMs = 0;
  /** 本轮计划出题总数，固定不变 */
  private readonly planned: number;
  /** 已经出过的题数 */
  private asked = 0;

  readonly uniqueTotal: number;
  score = 0;
  streak = 0;
  bestStreak = 0;

  constructor(facts: Fact[], seed = Date.now() ^ (Math.random() * 0xffffffff)) {
    this.rng = mulberry32(seed >>> 0);
    // 出场顺序再打乱一次，保证任何调用方都不会让题目呈现规律顺序
    this.queue = shuffle(facts, this.rng);
    this.uniqueTotal = new Set(facts.map((f) => f.key)).size;
    this.planned = this.queue.length;
  }

  get currentQuestion(): Question | null {
    return this.current;
  }

  /** 本轮已答对的题数（含重复） */
  get correctCount(): number {
    return this.logs.filter((l) => l.correct).length;
  }

  get isComplete(): boolean {
    return this.asked >= this.planned;
  }

  /** 本轮计划出题数（固定值） */
  get plannedTotal(): number {
    return this.planned;
  }

  /** 已出过的题数 */
  get askedCount(): number {
    return this.asked;
  }

  /** 取出下一题；答满计划题数后返回 null */
  next(): Question | null {
    if (this.asked >= this.planned || this.queue.length === 0) return null;
    const fact = this.queue.shift()!;
    const progress = getProgress(fact.key);
    const question = makeQuestion(fact, progress.stage, this.rng);
    this.current = question;
    this.asked += 1;
    // 时限由掌握阶段决定，跟着题目一起下发，避免 UI 自己猜规则
    this.timeLimitMs = timeLimitForStage(progress.stage);
    return this.current;
  }

  /** 当前题目的答题时限 */
  get currentTimeLimit(): number {
    return this.timeLimitMs;
  }

  /**
   * 提交答案（数字本身），返回本次作答记录。
   * 传 null 表示超时未答。
   */
  submit(value: number | null): AnswerLog {
    const question = this.current!;
    const timeout = value === null;
    const correct = !timeout && isCorrect(question, value);
    // 本轮题数固定、同题不重复出，所以每次作答都是这条口诀在本轮的第一次
    const firstTry = !this.missed.has(question.fact.key);
    const outcome: AnswerOutcome = timeout ? "timeout" : correct ? "correct" : "wrong";
    const change = recordAnswer(question.fact.key, outcome, firstTry, timeout ? -1 : (value ?? -1));
    let gained = 0;

    if (correct) {
      gained = firstTry ? 10 + Math.min(this.streak, 5) * 2 : 5;
      this.score += gained;
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
    } else {
      /*
       * 答错和超时都算没答出来：连击清零。
       * 这题不会再插回本轮队列（本轮题数固定），
       * 但阶段已退级并立即可复习，下一轮会优先再考。
       */
      this.streak = 0;
      this.missed.add(question.fact.key);
    }
    this.current = null;

    const log: AnswerLog = {
      question,
      value: value ?? -1,
      correct,
      timeout,
      firstTry,
      stageBefore: change.before,
      stageAfter: change.after,
      newlyMastered: change.newlyMastered,
      gained,
    };
    this.logs.push(log);
    return log;
  }

  finish(): SessionResult {
    const askedTotal = this.logs.length;
    const correctCount = this.logs.filter((l) => l.correct).length;
    // 星级按"答对率"算：本轮出了多少题、答对多少题
    const ratio = askedTotal === 0 ? 0 : correctCount / askedTotal;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
    // 同一条口诀本轮可能被记录多次，按口诀去重后再统计
    const bestStage = new Map<string, { before: Stage; after: Stage }>();
    for (const log of this.logs) {
      const key = log.question.fact.key;
      const record = bestStage.get(key);
      if (!record) {
        bestStage.set(key, { before: log.stageBefore, after: log.stageAfter });
      } else {
        record.after = Math.max(record.after, log.stageAfter) as Stage;
        record.before = Math.min(record.before, log.stageBefore) as Stage;
      }
    }
    const advanced = [...bestStage.values()].filter((r) => r.after > r.before).length;

    return {
      total: askedTotal,
      correctCount,
      advanced,
      newlyMastered: this.logs.filter((l) => l.newlyMastered).length,
      timeoutCount: this.logs.filter((l) => l.timeout).length,
      wrongCount: this.logs.filter((l) => !l.correct).length,
      score: this.score,
      bestStreak: this.bestStreak,
      stars,
      wrongKeys: [...new Set(this.logs.filter((l) => !l.correct).map((l) => l.question.fact.key))],
    };
  }
}
