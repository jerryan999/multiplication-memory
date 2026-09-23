import {
  DEFAULT_SETTINGS,
  QUESTION_PRESETS,
  TIME_PRESETS_MASTERED,
  TIME_PRESETS_UNFAMILIAR,
  type Settings,
} from "../../game/simulation/settings";

function options(
  presets: number[],
  current: number,
  action: string,
  suffix: string,
): string {
  return presets
    .map(
      (value) => `
        <button class="chip ${value === current ? "on" : ""}" data-action="${action}" data-id="${value}">
          ${value}${suffix}${value === DEFAULT_SETTINGS.questionsPerRound && action === "set-questions" ? "（默认）" : ""}
        </button>`,
    )
    .join("");
}

/** 设置面板：题数与限时都可调，孩子的节奏不一样 */
export function renderSettings(s: Settings): string {
  return `
    <div class="settings-modal" data-action="settings-close">
      <!-- 点空白处关闭；点面板内部不会触发，因为按钮自身带 data-action -->
      <section class="panel settings">
        <header class="chart-header">
          <div>
            <h2>练习设置</h2>
            <p class="chart-sub">按孩子的节奏调整，改完立即生效</p>
          </div>
          <button class="btn mini" data-action="settings-close">✕ 关闭</button>
        </header>

        <div class="setting-group">
          <h3>每次练习题数</h3>
          <p class="setting-note">当前：每轮 ${s.questionsPerRound} 题</p>
          <div class="chips">
            ${QUESTION_PRESETS.map(
              (v) => `
                <button class="chip ${v === s.questionsPerRound ? "on" : ""}" data-action="set-questions" data-id="${v}">
                  ${v} 题${v === DEFAULT_SETTINGS.questionsPerRound ? " ★" : ""}
                </button>`,
            ).join("")}
          </div>
        </div>

        <div class="setting-group">
          <h3>还没记牢的口诀 · 每题限时</h3>
          <p class="setting-note">
            适合刚开始学的口诀，给足思考时间。当前：${s.limitUnfamiliar} 秒
          </p>
          <div class="chips">
            ${options(TIME_PRESETS_UNFAMILIAR, s.limitUnfamiliar, "set-unfamiliar", " 秒")}
          </div>
        </div>

        <div class="setting-group">
          <h3>已经掌握的口诀 · 每题限时</h3>
          <p class="setting-note">
            背会的标准是脱口而出，所以这一档更快。当前：${s.limitMastered} 秒
          </p>
          <div class="chips">
            ${options(TIME_PRESETS_MASTERED, s.limitMastered, "set-mastered", " 秒")}
          </div>
        </div>

        <div class="setting-group">
          <p class="setting-note">
            介于两者之间、正在练习中的口诀，会取上面两个时间的中间值。
          </p>
          <button class="btn ghost" data-action="settings-reset">恢复默认（20 题 / 15 秒 / 8 秒）</button>
        </div>
      </section>
    </div>`;
}
