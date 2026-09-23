import {
  relativeTime,
  summarizeMistakes,
  type MistakeRecord,
} from "../../game/simulation/mistakes";
import { STAGE_COLOR, type Stage } from "../../game/simulation/mastery";

/**
 * 错题本：一次看完所有答错过的口诀。
 * 不只看"错了几次"，还给出"错成了什么"和可能混淆的那条口诀。
 */
export function renderMistakes(records: MistakeRecord[]): string {
  const summary = summarizeMistakes(records);

  const rows = records
    .map((r) => {
      const { fact, progress } = r;
      const stage = progress.stage as Stage;
      const wrongText =
        r.lastWrongValue === -1 ? "超时没答出来" : `答成了 ${r.lastWrongValue}`;
      const hint = r.confusedWith
        ? `可能是把「${r.confusedWith.koujue}」记混了`
        : "";

      return `
        <div class="mistake-item ${r.recovered ? "recovered" : ""}">
          <div class="mistake-head">
            <span class="mistake-q">${fact.a} × ${fact.b} = <b>${fact.product}</b></span>
            <span class="mistake-stage" style="--stage:${STAGE_COLOR[stage]}">
              ${r.recovered ? "已练会" : "还要练"}
            </span>
          </div>
          <div class="mistake-koujue">${fact.koujue}</div>
          <div class="mistake-meta">
            <span class="mistake-wrong">错过 ${r.wrongCount} 次 · 最近${wrongText}</span>
            <span class="mistake-time">${relativeTime(r.lastWrongAt)}</span>
          </div>
          ${hint ? `<div class="mistake-hint">💡 ${hint}</div>` : ""}
        </div>`;
    })
    .join("");

  return `
    <div class="chart-modal" data-action="mistakes-close">
      <section class="panel mistakes">
        <header class="chart-header">
          <div>
            <h2>错题本</h2>
            <p class="chart-sub">所有答错过的口诀都会留在这里，练会了也不会消失</p>
          </div>
          <button class="btn mini" data-action="mistakes-close">✕ 关闭</button>
        </header>

        <div class="chart-summary">
          <span>共 <b>${summary.total}</b> 条错题</span>
          <span>还要练 <b>${summary.unresolved}</b> 条</span>
          <span>已练会 <b>${summary.recovered}</b> 条</span>
          ${summary.timedOut > 0 ? `<span>超时 <b>${summary.timedOut}</b> 条</span>` : ""}
        </div>

        ${
          records.length === 0
            ? `<p class="perfect">🎉 还没有错题，继续保持！</p>`
            : `<div class="mistake-list">${rows}</div>`
        }

        <p class="chart-tip">
          想集中练这些错题？关掉本页点「开始考试」，系统会优先安排还要练的口诀。
        </p>
      </section>
    </div>`;
}
