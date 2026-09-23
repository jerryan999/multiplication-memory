/**
 * 练习参数（唯一事实来源）。
 * 题数和限时都允许调整：孩子的节奏不一样，写死的数值迟早不合适。
 */

const STORAGE_KEY = "jiujiu-settings:v1";

export interface Settings {
  /** 每次练习的题数 */
  questionsPerRound: number;
  /** 还没记牢的口诀（新遇到 / 刚答对一次）每题限时，单位秒 */
  limitUnfamiliar: number;
  /** 已经掌握的口诀每题限时，单位秒 */
  limitMastered: number;
}

export const DEFAULT_SETTINGS: Settings = {
  questionsPerRound: 20,
  limitUnfamiliar: 15,
  limitMastered: 8,
};

export const QUESTION_PRESETS = [10, 20, 30, 45];
export const TIME_PRESETS_UNFAMILIAR = [10, 15, 20, 30];
export const TIME_PRESETS_MASTERED = [5, 8, 12, 20];

export const MIN_QUESTIONS = 5;
export const MAX_QUESTIONS = 45;
export const MIN_SECONDS = 3;
export const MAX_SECONDS = 60;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function sanitize(raw: Partial<Settings> | null | undefined): Settings {
  return {
    questionsPerRound: clamp(
      raw?.questionsPerRound ?? DEFAULT_SETTINGS.questionsPerRound,
      MIN_QUESTIONS,
      MAX_QUESTIONS,
    ),
    limitUnfamiliar: clamp(
      raw?.limitUnfamiliar ?? DEFAULT_SETTINGS.limitUnfamiliar,
      MIN_SECONDS,
      MAX_SECONDS,
    ),
    limitMastered: clamp(
      raw?.limitMastered ?? DEFAULT_SETTINGS.limitMastered,
      MIN_SECONDS,
      MAX_SECONDS,
    ),
  };
}

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return sanitize(JSON.parse(raw) as Partial<Settings>);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function setSettings(patch: Partial<Settings>): Settings {
  const next = sanitize({ ...getSettings(), ...patch });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 隐私模式下不可写时保持本次会话内生效
  }
  return next;
}

export function resetSettings(): Settings {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略
  }
  return { ...DEFAULT_SETTINGS };
}
