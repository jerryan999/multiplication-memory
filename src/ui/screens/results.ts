import { factFromKey, type Fact } from "../../game/content/facts";
import type { SessionResult } from "../../game/simulation/session";
import type { MasteryStats } from "../../game/simulation/mastery";

export function renderResults(
  result: SessionResult,
  stats: MasteryStats,
  totalFacts: number,
  title: string,
): string {
  const stars = [1, 2, 3]
    .map((n) => `<span class="star ${n <= result.stars ? "lit" : ""}">⭐</span>`)
    .join("");

  const wrongList = result.wrongKeys
    .map((key) => factFromKey(key))
    .filter((f): f is Fact => Boolean(f))
    .map(
      (fact) => `
        <div class="wrong-item">
          <span class="wrong-q">${fact.a} × ${fact.b} = ${fact.product}</span>
          <b class="koujue">${fact.koujue}</b>
        </div>`,
    )
    .join("");

  const praise =
    result.wrongCount === 0
      ? "太稳了，这一轮全部答对！"
      : result.stars === 3
        ? "答得很好，再练一轮就更牢了。"
        : result.stars === 2
          ? "不错，把错的那几条再练练会更牢。"
          : "别着急，错题都记下来了，多练几轮就会好很多。";

  return `
    <section class="panel results">
      <h2 class="result-title">${title} · 完成！</h2>
      <div class="stars">${stars}</div>
      <p class="result-praise">${praise}</p>

      <div class="result-grid">
        <div class="stat"><span>答对</span><b>${result.correctCount}/${result.total} 题</b></div>
        <div class="stat highlight"><span>本轮进步</span><b>${result.advanced} 条</b></div>
        <div class="stat"><span>最高连击</span><b>${result.bestStreak} 🔥</b></div>
      </div>

      ${
        result.newlyMastered > 0
          ? `<p class="newly-line">🎊 其中 <b>${result.newlyMastered}</b> 条新达到「已掌握」</p>`
          : ""
      }
      ${
        result.timeoutCount > 0
          ? `<p class="timeout-line">⏰ 有 <b>${result.timeoutCount}</b> 题没在时间内答出来，再练一练会更快</p>`
          : ""
      }

      <p class="total-line">全部口诀已经背会 <b>${stats.mastered}</b> / ${totalFacts} 条</p>

      <h3 class="review-title">📖 这几条还要再练</h3>
      ${
        wrongList
          ? `<div class="wrong-list">${wrongList}</div>`
          : `<p class="perfect">🎉 全部一次答对，这一轮的口诀已经很牢了！</p>`
      }

      <div class="actions">
        <button class="btn primary" data-action="results-again">再来一轮</button>
        <button class="btn ghost" data-action="chart">看掌握地图</button>
        <button class="btn ghost" data-action="home">回到主页</button>
      </div>
    </section>`;
}
