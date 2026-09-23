import type { Question } from "../../game/simulation/questions";
import { planLabel, type Plan } from "../../game/simulation/planner";
import { WARN_RATIO } from "../../game/simulation/timing";

export interface QuizView {
  question: Question;
  typed: string;
  score: number;
  streak: number;
  /** 当前是本轮第几题 */
  askedNumber: number;
  /** 本轮总题数 */
  total: number;
  title: string;
  color: string;
  plan: Plan;
  /** 本题时限与剩余时间（毫秒） */
  timeLimit: number;
  remaining: number;
}

/**
 * 待填的空位有两种表示：空字符串（等号右侧）和 "?"（缺项填空的因数）。
 * 两者都必须渲染成高亮空格，否则 "?" 会被当成数字显示，看不出该填哪里。
 */
function slot(value: string, cls: string): string {
  return value === "" || value === "?"
    ? `<span class="q-slot">？</span>`
    : `<span class="num ${cls}">${value}</span>`;
}

function choiceArea(question: Question): string {
  const options = question.options
    .map(
      (option, i) => `
        <button class="option" data-action="option" data-id="${option}">
          <span class="opt-key">${i + 1}</span>${option}
        </button>`,
    )
    .join("");
  return `<div class="options" role="group" aria-label="答案选项">${options}</div>`;
}

function typeArea(typed: string): string {
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    .map((n) => `<button class="key" data-action="key" data-id="${n}">${n}</button>`)
    .join("");
  return `
    <div class="type-area">
      <div class="typed-box ${typed ? "filled" : ""}">
        <span class="typed-value">${typed || "?"}</span>
      </div>
      <div class="keypad">
        ${keys}
        <button class="key wide" data-action="key" data-id="del">⌫ 删除</button>
        <button class="key" data-action="key" data-id="0">0</button>
        <button class="key ok" data-action="key" data-id="ok">确定</button>
      </div>
    </div>`;
}

export function renderQuiz(view: QuizView): string {
  const { question, typed, score, streak, askedNumber, total, title, color, plan, timeLimit, remaining } = view;
  const pct = total === 0 ? 0 : Math.round((askedNumber / total) * 100);
  const kindLabel =
    question.kind === "choice" ? "选择题" : question.kind === "input" ? "自己写答案" : "填空";
  const remainPct = timeLimit === 0 ? 0 : Math.max(0, Math.min(100, (remaining / timeLimit) * 100));
  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  const warning = remainPct <= WARN_RATIO * 100;

  return `
    <section class="panel quiz">
      <header class="quiz-header">
        <div>
          <h2 class="level-name" style="--accent:${color}">${title}</h2>
          <p class="level-sub">${kindLabel} · ${question.hint} · 每题限时 ${Math.round(timeLimit / 1000)} 秒</p>
        </div>
        <div class="hud">
          <div class="hud-item"><span>⭐</span><b data-hud="score">${score}</b></div>
          <div class="hud-item"><span>🔥</span><b data-hud="streak">${streak}</b></div>
          <button class="btn mini" data-action="home" title="回到主页">返回</button>
        </div>
      </header>

      <div class="timer ${warning ? "warn" : ""}" role="timer" aria-live="off">
        <div class="timer-bar" style="width:${remainPct}%"></div>
        <span class="timer-num">${seconds}</span>
      </div>

      <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
      <p class="question-count">第 ${askedNumber} / ${total} 题 · ${planLabel(plan)}</p>

      <div class="question-card">
        <div class="question-text">
          ${slot(question.left, "q-left")}
          <span class="times">×</span>
          ${slot(question.right, "q-right")}
          <span class="equals">=</span>
          ${slot(question.result, "q-result")}
        </div>
      </div>

      ${question.kind === "choice" ? choiceArea(question) : typeArea(typed)}
      <div class="feedback-slot" aria-live="polite"></div>
    </section>`;
}
