import { getLevel, LEVELS, type LevelId } from "../game/content/levels";
import { QuizSession } from "../game/simulation/state";
import { toKouJue } from "../game/simulation/questions";
import { sceneBridge } from "../phaser/adapters/sceneBridge";
import { backToMenu, startRoundScene } from "../phaser/gameManager";
import { sfx } from "./sound";

type Screen = "menu" | "quiz" | "results" | "chart";

export class App {
  private screen: Screen = "menu";
  private session: QuizSession | null = null;
  private level = LEVELS[0];
  private locked = false;

  constructor(private root: HTMLElement) {}

  init() {
    this.root.addEventListener("click", this.onClick);
    document.addEventListener("keydown", this.onKey);
    this.showMenu();
  }

  private onClick = (event: MouseEvent) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const id = target.dataset.id;

    if (action === "close-chart") {
      this.showMenu();
      return;
    }
    if (target.classList.contains("chart-modal")) {
      this.showMenu();
      return;
    }

    switch (action) {
      case "level":
        this.startLevel(id === "mixed" ? "mixed" : Number(id));
        break;
      case "chart":
        this.showChart();
        break;
      case "restart":
        if (this.level) this.startLevel(this.level.id);
        break;
      case "menu":
        backToMenu();
        this.showMenu();
        break;
      case "option":
        this.submit(Number(id));
        break;
    }
  };

  private onKey = (event: KeyboardEvent) => {
    if (this.screen === "chart" && event.key === "Escape") {
      this.showMenu();
      return;
    }
    if (this.screen !== "quiz" || this.locked) return;
    if (["1", "2", "3", "4"].includes(event.key)) {
      this.submit(Number(event.key) - 1);
    }
  };

  private showMenu() {
    this.screen = "menu";
    const cards = LEVELS.map(
      (level) => `
        <button class="level-card" data-action="level" data-id="${level.id}" style="--accent:${level.color}">
          <span class="level-num">${level.id === "mixed" ? "✨" : level.id}</span>
          <span class="level-title">${level.title}</span>
          <span class="level-sub">${level.subtitle}</span>
        </button>`,
    ).join("");

    this.root.innerHTML = `
      <section class="panel menu">
        <div class="hero">
          <h1>乘法口诀小勇士 🧮</h1>
          <p>挑战 9 行口诀，答错的题会自动复现，直到你真正记住！</p>
        </div>
        <div class="level-grid">${cards}</div>
        <footer class="menu-footer">
          <button class="btn ghost" data-action="chart">📖 查看口诀表</button>
          <p class="hint">从 1 的乘法开始，一路打到 9 和混合挑战 👑</p>
        </footer>
      </section>`;
  }

  private startLevel(id: LevelId) {
    this.level = getLevel(id);
    this.session = new QuizSession(this.level);
    this.locked = false;
    sfx.click();
    startRoundScene();
    this.renderQuestion();
  }

  private progressPct(): number {
    if (!this.session || this.session.uniqueTotal === 0) return 0;
    return Math.round((this.session.answeredCount / this.session.uniqueTotal) * 100);
  }

  private renderQuestion() {
    if (!this.session) return;
    this.screen = "quiz";
    this.locked = false;
    const question = this.session.next();
    if (!question) {
      this.showResults();
      return;
    }
    const options = this.session.currentOptions;
    const current = Math.min(this.session.answeredCount + 1, this.session.uniqueTotal);

    this.root.innerHTML = `
      <section class="panel quiz">
        <header class="quiz-header">
          <div>
            <h2 class="level-name" style="--accent:${this.level.color}">${this.level.title}</h2>
            <p class="level-sub">${this.level.subtitle}</p>
          </div>
          <div class="hud">
            <div class="hud-item"><span class="hud-icon">⭐</span><b data-hud="score">${this.session.score}</b></div>
            <div class="hud-item"><span class="hud-icon">🔥</span><b data-hud="streak">${this.session.streak}</b></div>
            <button class="btn mini" data-action="menu" title="返回关卡">退出</button>
          </div>
        </header>

        <div class="progress" aria-hidden="true">
          <div class="progress-bar" style="width:${this.progressPct()}%"></div>
        </div>
        <p class="question-count">第 ${current} / ${this.session.uniqueTotal} 题</p>

        <div class="question-card">
          <div class="question-text">
            <span class="num">${question.a}</span>
            <span class="times">×</span>
            <span class="num">${question.b}</span>
            <span class="equals">=</span>
            <span class="question-mark">？</span>
          </div>
        </div>

        <div class="options" role="group" aria-label="答案选项">
          ${options
            .map(
              (option, i) => `
                <button class="option" data-action="option" data-id="${i}">
                  <span class="opt-key">${i + 1}</span>${option}
                </button>`,
            )
            .join("")}
        </div>
        <div class="feedback-slot" aria-live="polite"></div>
      </section>`;
  }

  private submit(index: number) {
    if (!this.session || this.locked) return;
    this.locked = true;

    const log = this.session.submit(index);
    const question = log.question;
    const buttons = this.root.querySelectorAll<HTMLButtonElement>(".option");
    buttons.forEach((button, i) => {
      button.disabled = true;
      if (i === index) {
        button.classList.add(log.correct ? "chosen-correct" : "chosen-wrong");
      }
      if (this.session?.currentOptions[i] === question.answer) {
        button.classList.add("show-answer");
      }
    });

    const bar = this.root.querySelector<HTMLElement>(".progress-bar");
    if (bar) bar.style.width = `${this.progressPct()}%`;
    const scoreEl = this.root.querySelector<HTMLElement>("[data-hud='score']");
    const streakEl = this.root.querySelector<HTMLElement>("[data-hud='streak']");
    if (scoreEl) scoreEl.textContent = String(this.session.score);
    if (streakEl) streakEl.textContent = String(this.session.streak);

    const slot = this.root.querySelector<HTMLElement>(".feedback-slot");
    if (slot) {
      if (log.correct) {
        sfx.correct();
        sceneBridge.emit("fx-correct", { a: question.a, b: question.b });
        slot.innerHTML = `
          <div class="feedback correct">
            <span>🎉 答对了！</span>
            <b class="koujue">${toKouJue(question.a, question.b)}</b>
            <span class="score-gain">+${log.gained}</span>
          </div>`;
      } else {
        sfx.wrong();
        sceneBridge.emit("fx-wrong", { a: question.a, b: question.b });
        slot.innerHTML = `
          <div class="feedback wrong">
            <span>💪 记一下：</span>
            <b class="koujue">${toKouJue(question.a, question.b)}</b>
            <span>稍后还会再考你一次哦</span>
          </div>`;
      }
    }

    // 答错后多留时间看口诀，答对也稍微放宽，避免一闪而过
    window.setTimeout(() => this.advance(), log.correct ? 1200 : 3500);
  }

  private advance() {
    if (!this.session) return;
    if (this.session.isComplete) this.showResults();
    else this.renderQuestion();
  }

  private showResults() {
    if (!this.session) return;
    this.screen = "results";
    const result = this.session.finish();
    sfx.win();
    sceneBridge.emit("fx-win", { score: result.score });

    const stars = [1, 2, 3]
      .map((n) => `<span class="star ${n <= result.stars ? "lit" : ""}">⭐</span>`)
      .join("");

    const seen = new Set<string>();
    const wrongItems = result.wrongAnswers
      .filter((log) => {
        if (seen.has(log.question.key)) return false;
        seen.add(log.question.key);
        return true;
      })
      .map(
        (log) => `
          <div class="wrong-item">
            <span class="wrong-q">${log.question.text} = ？</span>
            <span class="wrong-picked">你选了 ${log.picked}</span>
            <b class="koujue">${toKouJue(log.question.a, log.question.b)}</b>
          </div>`,
      )
      .join("");

    this.root.innerHTML = `
      <section class="panel results">
        <h2 class="result-title">${this.level.title} · 完成！</h2>
        <div class="stars">${stars}</div>
        <div class="result-grid">
          <div class="stat"><span>得分</span><b>${result.score}</b></div>
          <div class="stat"><span>首次答对</span><b>${result.firstTryCorrect}/${result.total}</b></div>
          <div class="stat"><span>最高连击</span><b>${result.bestStreak} 🔥</b></div>
        </div>
        <h3 class="review-title">📖 错题口诀复习</h3>
        ${
          wrongItems
            ? `<div class="wrong-list">${wrongItems}</div>`
            : `<p class="perfect">🎉 全部一次答对，口诀记得很牢，太棒了！</p>`
        }
        <div class="actions">
          <button class="btn primary" data-action="restart">再玩一次</button>
          <button class="btn ghost" data-action="menu">返回关卡</button>
        </div>
      </section>`;
  }

  private showChart() {
    this.screen = "chart";
    const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9]
      .map(
        (a) => `
          <div class="chart-row">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9]
              .map(
                (b) => `
                  <div class="chart-cell">
                    <span>${a}×${b}=${a * b}</span>
                    <small>${toKouJue(a, b)}</small>
                  </div>`,
              )
              .join("")}
          </div>`,
      )
      .join("");

    this.root.innerHTML = `
      <div class="chart-modal" data-action="close-chart">
        <section class="panel chart">
          <header class="chart-header">
            <h2>九九乘法口诀表</h2>
            <button class="btn mini" data-action="close-chart">✕ 关闭</button>
          </header>
          <div class="chart-scroll">
            <div class="chart-grid">${rows}</div>
          </div>
          <p class="chart-tip">小提示：先背熟口诀，再挑战乱序答题，记得更牢～</p>
        </section>
      </div>`;
  }
}
