import { FACTS, TOTAL_FACTS } from "../game/content/facts";
import { getDaily, recordSession } from "../game/simulation/daily";
import { getAllProgress, masteryStats, STAGE_LABEL } from "../game/simulation/mastery";
import { buildSmartPlan, type Plan } from "../game/simulation/planner";
import { PracticeSession, type AnswerLog, type SessionResult } from "../game/simulation/session";
import { sceneBridge } from "../phaser/adapters/sceneBridge";
import { startRoundScene } from "../phaser/gameManager";
import { renderChart } from "./screens/chart";
import { renderHome } from "./screens/home";
import { renderQuiz } from "./screens/quiz";
import { renderResults } from "./screens/results";
import { renderSettings } from "./screens/settings";
import { renderMistakes } from "./screens/mistakes";
import { collectMistakes } from "../game/simulation/mistakes";
import { sfx } from "./sound";
import { WARN_RATIO } from "../game/simulation/timing";
import { getSettings, resetSettings, setSettings } from "../game/simulation/settings";

type Screen = "home" | "quiz" | "results" | "chart" | "settings" | "mistakes";

interface RoundConfig {
  title: string;
  color: string;
  plan: Plan;
}

/**
 * 主控制器：只负责编排界面与转发输入，
 * 学习进度、抽题规则等真实状态都在 game/simulation 下。
 */
export class App {
  private screen: Screen = "home";
  private session: PracticeSession | null = null;
  private round: RoundConfig | null = null;
  private locked = false;
  private typed = "";
  /** 当前题剩余时间（毫秒）与计时器句柄 */
  private remaining = 0;
  private tickTimer = 0;
  private deadline = 0;

  constructor(private root: HTMLElement) {}

  init() {
    this.root.addEventListener("click", this.onClick);
    document.addEventListener("keydown", this.onKey);
    this.renderHome();
  }

  /* --------------------------------------------------------------- 事件 */

  private onClick = (event: MouseEvent) => {
    void sfx.unlock();
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) return;
    const { action, id } = target.dataset;

    switch (action) {
      case "start-quiz":
        this.startQuiz();
        break;
      case "option":
        this.submitValue(Number(id));
        break;
      case "key":
        this.pressKey(id ?? "");
        break;
      case "continue":
        // 答错/超时后由用户决定何时进入下一题
        if (this.locked) this.advance();
        break;
      case "chart":
        this.renderChart();
        break;
      case "chart-close":
        if (target.classList.contains("chart-modal") || target.classList.contains("btn")) {
          this.renderHome();
        }
        break;
      case "mistakes":
        this.renderMistakes();
        break;
      case "mistakes-close":
        if (target.classList.contains("chart-modal") || target.classList.contains("btn")) {
          this.renderHome();
        }
        break;
      case "results-again":
        this.startQuiz();
        break;
      case "home":
        this.renderHome();
        break;
      case "reset":
        this.resetProgress();
        break;
      case "settings":
        this.renderSettings();
        break;
      case "settings-close":
        // 只有点空白背景或关闭按钮才关闭，点面板内部不关闭
        if (target.classList.contains("settings-modal") || target.classList.contains("btn")) {
          this.renderHome();
        }
        break;
      case "set-questions":
        setSettings({ questionsPerRound: Number(id) });
        this.renderSettings();
        break;
      case "set-unfamiliar":
        setSettings({ limitUnfamiliar: Number(id) });
        this.renderSettings();
        break;
      case "set-mastered":
        setSettings({ limitMastered: Number(id) });
        this.renderSettings();
        break;
      case "settings-reset":
        resetSettings();
        this.renderSettings();
        break;
    }
  };

  private onKey = (event: KeyboardEvent) => {
    if (this.screen === "chart" && event.key === "Escape") {
      this.renderHome();
      return;
    }
    if (this.screen !== "quiz" || this.locked) return;
    const question = this.session?.currentQuestion;
    if (!question) return;

    if (question.kind === "choice" && ["1", "2", "3", "4"].includes(event.key)) {
      const option = question.options[Number(event.key) - 1];
      if (option !== undefined) this.submitValue(option);
      return;
    }
    if (/^[0-9]$/.test(event.key)) {
      this.pressKey(event.key);
      return;
    }
    if (event.key === "Backspace") {
      this.pressKey("del");
      return;
    }
    if (event.key === "Enter") this.pressKey("ok");
  };

  /* --------------------------------------------------------------- 主页 */

  private renderHome() {
    this.screen = "home";
    this.locked = false;
    window.clearInterval(this.tickTimer);
    const settings = getSettings();
    const mistakes = collectMistakes();
    this.root.innerHTML = renderHome(
      masteryStats(),
      getDaily(),
      getAllProgress(),
      settings.questionsPerRound,
      settings.limitUnfamiliar,
      mistakes.length,
      mistakes.filter((m) => !m.recovered).length,
    );
  }

  private resetProgress() {
    if (!window.confirm("确定清空全部记录吗？清空后所有口诀会回到「还没学」状态。")) return;
    try {
      localStorage.removeItem("jiujiu-mastery:v2");
      localStorage.removeItem("jiujiu-daily:v2");
    } catch {
      // 忽略
    }
    this.renderHome();
  }

  /* ------------------------------------------------------------- 考试 */

  /** 打开就考：直接按掌握度抽一套题，不做学习环节 */
  private startQuiz() {
    sfx.click();
    const plan = buildSmartPlan();
    if (plan.facts.length === 0) {
      this.startRound({
        title: "全部复习",
        color: "#10b981",
        plan: { facts: FACTS, reviewCount: FACTS.length, newCount: 0 },
      });
      return;
    }
    this.startRound({ title: "口诀挑战", color: "#a78bfa", plan });
  }

  private startRound(config: RoundConfig) {
    this.round = config;
    this.session = new PracticeSession(config.plan.facts);
    this.locked = false;
    this.typed = "";
    startRoundScene();
    this.renderQuestion();
  }

  /* ------------------------------------------------------------- 答题 */

  private renderQuestion() {
    if (!this.session || !this.round) return;
    this.screen = "quiz";
    this.locked = false;
    this.typed = "";
    const question = this.session.next();
    if (!question) {
      this.renderResults();
      return;
    }
    this.remaining = this.session.currentTimeLimit;
    this.deadline = performance.now() + this.remaining;
    this.root.innerHTML = renderQuiz({
      question,
      typed: this.typed,
      score: this.session.score,
      streak: this.session.streak,
      askedNumber: this.session.askedCount,
      total: this.session.plannedTotal,
      title: this.round.title,
      color: this.round.color,
      plan: this.round.plan,
      timeLimit: this.session.currentTimeLimit,
      remaining: this.remaining,
    });
    this.startTimer();
  }

  /** 每题倒计时；到点自动按超时处理 */
  private startTimer() {
    window.clearInterval(this.tickTimer);
    this.tickTimer = window.setInterval(() => {
      if (this.locked || !this.session) return;
      this.remaining = Math.max(0, this.deadline - performance.now());
      this.syncTimer();
      if (this.remaining <= 0) {
        window.clearInterval(this.tickTimer);
        this.submitValue(null);
      }
    }, 100);
  }

  private syncTimer() {
    const limit = this.session?.currentTimeLimit ?? 1;
    const pct = Math.max(0, Math.min(100, (this.remaining / limit) * 100));
    const bar = this.root.querySelector<HTMLElement>(".timer-bar");
    if (bar) bar.style.width = `${pct}%`;
    const num = this.root.querySelector<HTMLElement>(".timer-num");
    if (num) num.textContent = String(Math.max(0, Math.ceil(this.remaining / 1000)));
    const wrap = this.root.querySelector<HTMLElement>(".timer");
    wrap?.classList.toggle("warn", pct <= WARN_RATIO * 100);
  }

  private pressKey(key: string) {
    if (this.locked) return;
    if (key === "del") {
      this.typed = this.typed.slice(0, -1);
      this.syncTyped();
      return;
    }
    if (key === "ok") {
      if (this.typed === "") return;
      this.submitValue(Number(this.typed));
      return;
    }
    if (!/^[0-9]$/.test(key) || this.typed.length >= 2) return;
    this.typed += key;
    this.syncTyped();
    sfx.keypad();
  }

  private syncTyped() {
    const el = this.root.querySelector<HTMLElement>(".typed-value");
    if (el) el.textContent = this.typed || "?";
    this.root.querySelector<HTMLElement>(".typed-box")?.classList.toggle("filled", this.typed !== "");
  }

  private submitValue(value: number | null) {
    if (!this.session || this.locked) return;
    if (value !== null && !Number.isFinite(value)) return;
    window.clearInterval(this.tickTimer);
    this.locked = true;
    this.showFeedback(this.session.submit(value));
  }

  private showFeedback(log: AnswerLog) {
    if (!this.session || !this.round) return;
    const fact = log.question.fact;

    this.root.querySelectorAll<HTMLButtonElement>(".option").forEach((button) => {
      button.disabled = true;
      const option = Number(button.dataset.id);
      if (option === log.value) button.classList.add(log.correct ? "chosen-correct" : "chosen-wrong");
      if (option === log.question.expected) button.classList.add("show-answer");
    });

    const typed = this.root.querySelector<HTMLElement>(".typed-value");
    if (typed && !log.timeout) {
      typed.textContent = String(log.value);
      typed.classList.add(log.correct ? "is-correct" : "is-wrong");
    }
    this.root.querySelector<HTMLElement>(".keypad")?.classList.add("locked");
    this.root.querySelector<HTMLElement>(".timer")?.classList.add("stopped");

    this.syncHud();

    const slot = this.root.querySelector<HTMLElement>(".feedback-slot");
    if (slot) {
      if (log.correct) {
        sfx.correct();
        sceneBridge.emit("fx-correct", { a: fact.a, b: fact.b });
        const upgraded = log.newlyMastered
          ? `<span class="upgrade">🎊 这条口诀背会啦！</span>`
          : log.stageAfter > log.stageBefore
            ? `<span class="upgrade">进步了：${STAGE_LABEL[log.stageAfter]}</span>`
            : "";
        slot.innerHTML = `
          <div class="feedback correct">
            <span>🎉 答对了！</span>
            <b class="koujue">${fact.koujue}</b>
            <span class="score-gain">+${log.gained}</span>
            ${upgraded}
          </div>`;
      } else if (log.timeout) {
        sfx.wrong();
        sceneBridge.emit("fx-wrong", { a: fact.a, b: fact.b });
        slot.innerHTML = `
          <div class="feedback timeout">
            <div class="feedback-main">
              <span>⏰ 时间到，没答出来</span>
              <b class="koujue">${fact.koujue}</b>
            </div>
            <p class="retry-note">看熟了再继续，稍后还会考你一次</p>
            <button class="btn primary continue-btn" data-action="continue">我记住了，继续 ▶</button>
          </div>`;
      } else {
        sfx.wrong();
        sceneBridge.emit("fx-wrong", { a: fact.a, b: fact.b });
        slot.innerHTML = `
          <div class="feedback wrong">
            <div class="feedback-main">
              <span>💪 记住它：</span>
              <b class="koujue">${fact.koujue}</b>
            </div>
            <p class="retry-note">看清楚口诀再继续，稍后还会考你一次</p>
            <button class="btn primary continue-btn" data-action="continue">我记住了，继续 ▶</button>
          </div>`;
      }
    }

    /*
     * 答对自动进入下一题；答错和超时交给用户点"继续"——
     * 自动跳题会让想看清楚口诀的孩子来不及看，
     * 也让"记住了没有"变成由计时器决定，而不是由孩子决定。
     */
    if (log.correct) window.setTimeout(() => this.advance(), 1400);
  }

  private syncHud() {
    if (!this.session || !this.round) return;
    const scoreEl = this.root.querySelector<HTMLElement>("[data-hud='score']");
    const streakEl = this.root.querySelector<HTMLElement>("[data-hud='streak']");
    if (scoreEl) scoreEl.textContent = String(this.session.score);
    if (streakEl) streakEl.textContent = String(this.session.streak);

    const bar = this.root.querySelector<HTMLElement>(".progress-bar");
    if (bar) {
      const pct = Math.round((this.session.askedCount / this.session.plannedTotal) * 100);
      bar.style.width = `${pct}%`;
    }
    const count = this.root.querySelector<HTMLElement>(".question-count");
    if (count) {
      count.textContent = `第 ${this.session.askedCount} / ${this.session.plannedTotal} 题`;
    }
  }

  private advance() {
    if (!this.session) return;
    if (this.session.isComplete) this.renderResults();
    else this.renderQuestion();
  }

  /* ------------------------------------------------------------- 结算 */

  private renderResults() {
    if (!this.session || !this.round) return;
    window.clearInterval(this.tickTimer);
    this.screen = "results";
    const result: SessionResult = this.session.finish();
    recordSession(result.correctCount, result.newlyMastered);
    sfx.win();
    if (result.newlyMastered > 0) sceneBridge.emit("fx-win", { score: result.score });
    this.root.innerHTML = renderResults(result, masteryStats(), TOTAL_FACTS, this.round.title);
  }

  /* ------------------------------------------------------- 口诀表/地图 */

  private renderChart() {
    this.screen = "chart";
    this.root.innerHTML = renderChart(masteryStats(), getAllProgress());
  }

  /* ------------------------------------------------------------- 设置 */

  private renderSettings() {
    this.screen = "settings";
    window.clearInterval(this.tickTimer);
    this.root.innerHTML = renderSettings(getSettings());
  }

  /* ----------------------------------------------------------- 错题本 */

  private renderMistakes() {
    this.screen = "mistakes";
    window.clearInterval(this.tickTimer);
    this.root.innerHTML = renderMistakes(collectMistakes());
  }
}
