import { ROW_FACTS, rowMeta, TOTAL_FACTS } from "../../game/content/facts";
import {
  STAGE_COLOR,
  STAGE_LABEL,
  type FactProgress,
  type MasteryStats,
  type Stage,
} from "../../game/simulation/mastery";

/** 口诀表 + 掌握地图：45 条约等于全部学习内容，颜色代表掌握程度 */
export function renderChart(stats: MasteryStats, progress: Map<string, FactProgress>): string {
  const rows = Array.from({ length: 9 }, (_, i) => i + 1)
    .map((row) => {
      const meta = rowMeta(row);
      const cells = ROW_FACTS[row]
        .map((fact) => {
          const stage = (progress.get(fact.key)?.stage ?? 0) as Stage;
          return `
            <div class="fact-cell" style="--stage:${STAGE_COLOR[stage]}" title="${STAGE_LABEL[stage]}">
              <span class="fact-formula">${fact.a}×${fact.b}=${fact.product}</span>
              <small>${fact.koujue}</small>
            </div>`;
        })
        .join("");
      return `
        <div class="fact-row">
          <span class="fact-row-label" style="--accent:${meta.color}">${row} 的口诀</span>
          <div class="fact-cells">${cells}</div>
        </div>`;
    })
    .join("");

  return `
    <div class="chart-modal" data-action="chart-close">
      <section class="panel chart">
        <header class="chart-header">
          <div>
            <h2>九九乘法口诀表</h2>
            <p class="chart-sub">颜色代表掌握程度 · 点右上角关闭返回</p>
          </div>
          <button class="btn mini" data-action="chart-close">✕ 关闭</button>
        </header>

        <div class="chart-summary">
          <span>已背会 <b>${stats.mastered}</b> / ${TOTAL_FACTS} 条</span>
          <span>练习中 <b>${stats.learning}</b> 条</span>
          <span>还没学 <b>${stats.fresh}</b> 条</span>
        </div>
        <ul class="legend">
          ${[1, 2, 3, 4]
            .map((s) => `<li><i style="background:${STAGE_COLOR[s as Stage]}"></i>${STAGE_LABEL[s as Stage]}</li>`)
            .join("")}
          <li><i style="background:${STAGE_COLOR[0]}"></i>还没学</li>
        </ul>

        <div class="chart-scroll">${rows}</div>
        <p class="chart-tip">小提示：按顺序读出声，读熟了再做题，记得最牢。</p>
      </section>
    </div>`;
}
