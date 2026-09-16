import type { LevelConfig } from "../content/levels";
import { clearBank, bumpBank, pickBankQuestions } from "./bank";
import {
  generateOptions,
  generateRound,
  mulberry32,
  type Question,
  type RNG,
} from "./questions";

export interface AnswerLog {
  question: Question;
  options: number[];
  picked: number;
  correct: boolean;
  firstTry: boolean;
  gained: number;
}

export interface QuizResult {
  levelId: LevelConfig["id"];
  total: number;
  firstTryCorrect: number;
  score: number;
  bestStreak: number;
  stars: number;
  wrongAnswers: AnswerLog[];
}

/**
 * 一关的会话状态（唯一事实来源）。
 * 规则：答错的题排到队尾复现，直到答对；答对后从错题本清除。
 */
export class QuizSession {
  private level: LevelConfig;
  private rng: RNG;
  private pending: Question[] = [];
  private current: Question | null = null;
  private options: number[] = [];
  private answeredCorrect: string[] = [];
  private missed = new Set<string>();
  private logs: AnswerLog[] = [];

  score = 0;
  streak = 0;
  bestStreak = 0;
  uniqueTotal = 0;

  constructor(level: LevelConfig, seed = Date.now() ^ (Math.random() * 0xffffffff)) {
    this.level = level;
    this.rng = mulberry32(seed >>> 0);

    const bankQuestions = pickBankQuestions(level.rows, 3);
    const baseQuestions = generateRound(level, level.questionCount, this.rng);

    const seen = new Set<string>();
    const merged: Question[] = [];
    for (const q of [...bankQuestions, ...baseQuestions]) {
      if (!seen.has(q.key)) {
        seen.add(q.key);
        merged.push(q);
      }
    }
    this.pending = merged;
    this.uniqueTotal = merged.length;
  }

  get currentQuestion(): Question | null {
    return this.current;
  }

  get currentOptions(): number[] {
    return this.options;
  }

  get answeredCount(): number {
    return this.answeredCorrect.length;
  }

  get isComplete(): boolean {
    return this.pending.length === 0 && this.current === null;
  }

  /** 取出下一题；全部答完时返回 null */
  next(): Question | null {
    if (this.pending.length === 0) return null;
    this.current = this.pending.shift()!;
    this.options = generateOptions(this.current, this.rng);
    return this.current;
  }

  /** 提交所选答案（选项下标），返回本次作答记录 */
  submit(pickedIndex: number): AnswerLog {
    const question = this.current!;
    const picked = this.options[pickedIndex];
    const correct = picked === question.answer;
    const firstTry = !this.missed.has(question.key);
    let gained = 0;

    if (correct) {
      if (firstTry) {
        gained = 10 + Math.min(this.streak, 5) * 2;
        this.score += gained;
      } else {
        gained = 5;
        this.score += gained;
      }
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.answeredCorrect.push(question.key);
      // 只有"首次答对"才算真正记住，此时才从错题本移除；
      // 靠提示复现答对的题继续留在错题本，后续关卡还会优先抽考
      if (firstTry) clearBank(question.a, question.b);
      if (this.pending.length === 0) this.current = null;
    } else {
      this.streak = 0;
      if (!this.missed.has(question.key)) {
        this.missed.add(question.key);
        bumpBank(question.a, question.b);
      }
      // 错题排到队尾，稍后复现
      this.pending.push(question);
    }

    const log: AnswerLog = {
      question,
      options: this.options,
      picked,
      correct,
      firstTry,
      gained,
    };
    this.logs.push(log);
    return log;
  }

  finish(): QuizResult {
    const firstTryCorrect = this.logs.filter((l) => l.correct && l.firstTry).length;
    const ratio = this.uniqueTotal === 0 ? 0 : firstTryCorrect / this.uniqueTotal;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
    return {
      levelId: this.level.id,
      total: this.uniqueTotal,
      firstTryCorrect,
      score: this.score,
      bestStreak: this.bestStreak,
      stars,
      wrongAnswers: this.logs.filter((l) => !l.correct),
    };
  }
}
