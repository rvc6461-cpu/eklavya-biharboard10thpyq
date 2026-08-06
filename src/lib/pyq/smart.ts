import type { AttemptRecord, PyqState } from "./store";
import { listAttempts } from "./mockStore";

const GOAL_KEY = "eklavya.daily-goal.v1";
export const DAILY_GOALS = [20, 50, 100] as const;

export function getDailyGoal(): number {
  if (typeof window === "undefined") return 20;
  const value = Number(window.localStorage.getItem(GOAL_KEY));
  return DAILY_GOALS.includes(value as (typeof DAILY_GOALS)[number]) ? value : 20;
}

export function setDailyGoal(value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GOAL_KEY, String(value));
  window.dispatchEvent(new CustomEvent("eklavya:goal:update"));
}

export function dayKey(at: number) {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayCount(log: AttemptRecord[]) {
  const today = dayKey(Date.now());
  return log.filter((a) => dayKey(a.at) === today).length;
}

export function streakSummary(log: AttemptRecord[]) {
  const active = new Set(log.map((a) => dayKey(a.at)));
  const sorted = Array.from(active).sort();
  let best = 0;
  let run = 0;
  let previous = 0;
  for (const key of sorted) {
    const time = new Date(`${key}T00:00:00`).getTime();
    run = previous && Math.round((time - previous) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = time;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let daily = 0;
  for (let i = 0; i < 366; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (active.has(dayKey(d.getTime()))) daily += 1;
    else if (i > 0 || !active.has(dayKey(today.getTime()))) break;
  }
  const last7 = log.filter((a) => a.at >= Date.now() - 7 * 86400000);
  const last30 = log.filter((a) => a.at >= Date.now() - 30 * 86400000);
  return {
    daily,
    weekly: new Set(last7.map((a) => dayKey(a.at))).size,
    monthly: new Set(last30.map((a) => dayKey(a.at))).size,
    best,
    active,
  };
}

export type Achievement = { id: string; label: string; detail: string; unlocked: boolean };

export function achievements(state: PyqState): Achievement[] {
  const solved = state.attemptLog.length;
  const streak = streakSummary(state.attemptLog).best;
  const mocks = typeof window === "undefined" ? [] : listAttempts();
  return [
    { id: "first-mock", label: "First Mock", detail: "Complete your first full mock", unlocked: mocks.length >= 1 },
    { id: "100", label: "Century", detail: "Solve 100 questions", unlocked: solved >= 100 },
    { id: "500", label: "Practice Pro", detail: "Solve 500 questions", unlocked: solved >= 500 },
    { id: "1000", label: "Question Master", detail: "Solve 1,000 questions", unlocked: solved >= 1000 },
    { id: "perfect", label: "Perfect Score", detail: "Score 100% in a mock", unlocked: mocks.some((m) => m.total > 0 && m.correct === m.total) },
    { id: "7-day", label: "7-Day Streak", detail: "Study for 7 days in a row", unlocked: streak >= 7 },
    { id: "30-day", label: "30-Day Streak", detail: "Study for 30 days in a row", unlocked: streak >= 30 },
  ];
}

export function smartRevision(accuracy: number) {
  if (accuracy < 60) return "Revise this chapter and solve 20 more questions.";
  if (accuracy > 80) return "Excellent! You are ready for the next chapter.";
  return "Keep practising to strengthen this chapter.";
}