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
  const [state, setState] = useState<PyqState>(empty);

  useEffect(() => {
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
  }, []);

  const toggleBookmark = useCallback((questionId: string) => {
    const next = read();
    next.bookmarks = next.bookmarks.includes(questionId)
      ? next.bookmarks.filter((id) => id !== questionId)
      : [...next.bookmarks, questionId];
    write(next);
  }, []);

  return { state, recordAttempt, toggleBookmark };
}
