const STORAGE_KEY = "jiujiu-daily:v2";

export const DAILY_GOAL = 12;

export interface DailyState {
  date: string;
  answered: number;
  mastered: number;
  sessions: number;
  streakDays: number;
  lastActiveDate: string;
}

function today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function defaults(): DailyState {
  return {
    date: today(),
    answered: 0,
    mastered: 0,
    sessions: 0,
    streakDays: 0,
    lastActiveDate: "",
  };
}

export function getDaily(): DailyState {
  let state = defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...state, ...(JSON.parse(raw) as DailyState) };
  } catch {
    // 忽略损坏数据
  }
  // 跨天时当天计数归零，连续天数保留
  if (state.date !== today()) {
    state = { ...state, date: today(), answered: 0, mastered: 0, sessions: 0 };
  }
  return state;
}

function save(state: DailyState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 忽略
  }
}

/** 完成一轮练习后累计当天题数、新掌握数与连续学习天数 */
export function recordSession(answered: number, mastered: number) {
  const state = getDaily();
  const t = today();
  let streak = state.streakDays;

  if (state.lastActiveDate !== t) {
    const gap = state.lastActiveDate ? daysBetween(state.lastActiveDate, t) : 999;
    streak = gap === 1 ? state.streakDays + 1 : 1;
  }

  save({
    ...state,
    date: t,
    answered: state.answered + answered,
    mastered: state.mastered + mastered,
    sessions: state.sessions + 1,
    streakDays: streak,
    lastActiveDate: t,
  });
}

export function dailyGoalReached(): boolean {
  return getDaily().answered >= DAILY_GOAL;
}
