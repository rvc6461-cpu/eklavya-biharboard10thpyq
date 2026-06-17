// Offline practice store backed by localStorage.
// Tracks attempts, bookmarks, and the mistake notebook.

import { useEffect, useState, useCallback } from "react";

const KEY = "eklavya:pyq:v1";

export type AttemptRecord = {
  questionId: string;
  subjectId: string;
  chapterId: string;
  selected: number;
  correct: boolean;
  at: number;
};

export type PyqState = {
  attempts: Record<string, AttemptRecord>; // by questionId (latest)
  bookmarks: string[]; // questionIds
  mistakes: string[]; // questionIds where latest attempt was wrong
};

const empty: PyqState = { attempts: {}, bookmarks: [], mistakes: [] };

function read(): PyqState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return empty;
  }
}

function write(state: PyqState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("eklavya:pyq:update"));
}

export function usePyqStore() {
  // Lazy init so the very first render already reflects persisted state
  // (no flicker of "not bookmarked" before the effect runs).
  const [state, setState] = useState<PyqState>(() => read());

  useEffect(() => {
    // Re-sync after mount in case SSR returned the empty fallback.
    setState(read());
    const handler = () => setState(read());
    window.addEventListener("eklavya:pyq:update", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("eklavya:pyq:update", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const recordAttempt = useCallback((a: AttemptRecord) => {
    const next = read();
    next.attempts[a.questionId] = a;
    const inMistakes = next.mistakes.includes(a.questionId);
    if (!a.correct && !inMistakes) next.mistakes = [...next.mistakes, a.questionId];
    if (a.correct && inMistakes)
      next.mistakes = next.mistakes.filter((id) => id !== a.questionId);
    write(next);
    setState(next); // instant local update — don't wait for the event round-trip
  }, []);

  const toggleBookmark = useCallback((questionId: string) => {
    const next = read();
    next.bookmarks = next.bookmarks.includes(questionId)
      ? next.bookmarks.filter((id) => id !== questionId)
      : [...next.bookmarks, questionId];
    write(next);
    setState(next); // instant local update
  }, []);

  return { state, recordAttempt, toggleBookmark };
}
