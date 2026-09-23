import { ROW_FACTS, rowMeta, TOTAL_FACTS } from "../../game/content/facts";
import {
  MASTERED_STAGE,
  STAGE_COLOR,
  STAGE_LABEL,
  type FactProgress,
  type MasteryStats,
  type Stage,
} from "../../game/simulation/mastery";
import { DAILY_GOAL, type DailyState } from "../../game/simulation/daily";

const LEGEND_STAGES: Stage[] = [1, 2, 3, 4];

function legend(): string {
  const items = LEGEND_STAGES.map(
    (s) => `<li><i style="background:${STAGE_COLOR[s]}"></i>${STAGE_LABEL[s]}</li>`,
  ).join("");
  return `<ul class="legend">${items}<li><i style="background:${STAGE_COLOR[0]}"></i>还没掌握</li></ul>`;
}

/**
 * 主页：只显示"掌握了多少"和开始按钮。
 * 不提供按行练习——练习范围由掌握度自动安排。
 */
export function renderHome(
  stats: MasteryStats,
  daily: DailyState,
  progress: Map<string, FactProgress>,
  roundSize: number,
  limitUnfamiliar: number,
  mistakeCount: number,
  unresolvedCount: number,
): string {
  const pct = Math.round((stats.mastered / TOTAL_FACTS) * 100);
  const todayPct = Math.min(100, Math.round((daily.answered / DAILY_GOAL) * 100));

  // 每一行只作为进度展示，不可点击
  const rows = Array.from({ length: 9 }, (_, i) => i + 1)
    .map((row) => {
      const meta = rowMeta(row);
      const facts = ROW_FACTS[row];
      const mastered = facts.filter((f) => (progress.get(f.key)?.stage ?? 0) >= MASTERED_STAGE).length;
      const rowPct = Math.round((mastered / facts.length) * 100);
      const done = mastered === facts.length;
      return `
        <div class="row-card ${done ? "done" : ""}" style="--accent:${meta.color}">
          <span class="row-top">
            <b class="row-name">${done ? "✓ " : ""}${meta.title}</b>
            <span class="row-score">${mastered}/${facts.length}</span>
          </span>
          <span class="row-bar"><i style="width:${rowPct}%"></i></span>
        </div>`;
    })
    .join("");

  return `
    <section class="panel home">
      <header class="home-head">
        <div>
          <h1>乘法口诀小勇士 🧮</h1>
          <p class="home-sub">一套一套考，把 45 条口诀都背下来。每轮 ${roundSize} 题。</p>
        </div>
        <button class="btn mini" data-action="settings" title="调整题数与限时">⚙️ 设置</button>
      </header>

      <div class="mastery-card">
        <div class="ring" style="--pct:${pct}">
          <div class="ring-inner"><b>${stats.mastered}</b><small>/ ${TOTAL_FACTS} 条</small></div>
        </div>
        <div class="mastery-text">
          <h2>已经背会 ${stats.mastered} 条口诀</h2>
          <p class="mastery-note">
            ${stats.learning} 条还在练${stats.dueNow > 0 ? `，今天有 ${stats.dueNow} 条该复习了` : ""}
          </p>
          ${legend()}
        </div>
      </div>

      <button class="start-card" data-action="start-quiz">
        <span class="start-icon">🚀</span>
        <span class="start-text">
          <b>开始考试</b>
          <small>${roundSize} 题 · 还没记牢的 ${limitUnfamiliar} 秒一题 · 答错的会再考一次</small>
        </span>
        <span class="start-go">开始 ▶</span>
      </button>

      <div class="today-strip">
        <span>今天已练 <b>${daily.answered}</b> / ${DAILY_GOAL} 题</span>
        <span class="today-bar"><i style="width:${todayPct}%"></i></span>
        ${daily.streakDays > 1 ? `<span class="streak">🔥 连续 ${daily.streakDays} 天</span>` : ""}
      </div>

      <h2 class="section-title">九行口诀掌握情况</h2>
      <div class="row-grid">${rows}</div>

      <div class="more-tools">
        <button class="btn ghost ${unresolvedCount > 0 ? "alert" : ""}" data-action="mistakes">
          📕 错题本${mistakeCount > 0 ? `（${unresolvedCount > 0 ? `还要练 ${unresolvedCount} 条` : `${mistakeCount} 条`}）` : ""}
        </button>
        <button class="btn ghost" data-action="chart">📖 口诀表与掌握地图</button>
        <button class="btn ghost danger" data-action="reset">重新开始</button>
      </div>
    </section>`;
}
