import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePyqStore } from "./store";

const QID_A = "q-a";
const QID_B = "q-b";

beforeEach(() => {
  window.localStorage.clear();
});

describe("usePyqStore bookmark behavior", () => {
  it("reflects bookmark toggle synchronously (no flicker)", () => {
    const { result } = renderHook(() => usePyqStore());

    expect(result.current.state.bookmarks).toEqual([]);

    act(() => result.current.toggleBookmark(QID_A));
    // Must be true immediately on the very next render — not after a tick.
    expect(result.current.state.bookmarks).toContain(QID_A);

    act(() => result.current.toggleBookmark(QID_A));
    expect(result.current.state.bookmarks).not.toContain(QID_A);
  });

  it("keeps bookmark state stable across simulated shuffle/retry resets", () => {
    const { result } = renderHook(() => usePyqStore());

    act(() => {
      result.current.toggleBookmark(QID_A);
      result.current.toggleBookmark(QID_B);
    });
    expect(result.current.state.bookmarks).toEqual(
      expect.arrayContaining([QID_A, QID_B]),
    );

    // Simulate shuffle toggle / retry: a new mount of the practice screen
    // re-reads persisted state. Bookmarks must not flip.
    const remount = renderHook(() => usePyqStore());
    expect(remount.result.current.state.bookmarks).toEqual(
      expect.arrayContaining([QID_A, QID_B]),
    );

    // And the existing instance still agrees.
    expect(result.current.state.bookmarks).toEqual(
      expect.arrayContaining([QID_A, QID_B]),
    );
  });

  it("propagates updates across hook instances without inverting state", () => {
    const a = renderHook(() => usePyqStore());
    const b = renderHook(() => usePyqStore());

    act(() => a.result.current.toggleBookmark(QID_A));

    // Both instances should see the same truth — never opposite values.
    expect(a.result.current.state.bookmarks).toContain(QID_A);
    expect(b.result.current.state.bookmarks).toContain(QID_A);

    act(() => b.result.current.toggleBookmark(QID_A));
    expect(a.result.current.state.bookmarks).not.toContain(QID_A);
    expect(b.result.current.state.bookmarks).not.toContain(QID_A);
  });

  it("recording an attempt does not affect bookmark membership", () => {
    const { result } = renderHook(() => usePyqStore());

    act(() => result.current.toggleBookmark(QID_A));
    act(() =>
      result.current.recordAttempt({
        questionId: QID_A,
        subjectId: "s",
        chapterId: "c",
        selected: 0,
        correct: false,
        at: 1,
      }),
    );

    expect(result.current.state.bookmarks).toContain(QID_A);
    expect(result.current.state.mistakes).toContain(QID_A);
  });
});

describe("usePyqStore mistake notebook persistence", () => {
  const mkAttempt = (questionId: string, correct: boolean) => ({
    questionId,
    subjectId: "math",
    chapterId: "ch1",
    selected: 0,
    correct,
    at: Date.now(),
  });

  it("adds a wrong answer to mistakes once and does not duplicate on re-attempt", () => {
    const { result } = renderHook(() => usePyqStore());

    act(() => result.current.recordAttempt(mkAttempt(QID_A, false)));
    expect(result.current.state.mistakes).toEqual([QID_A]);

    // Retry the same wrong answer — still exactly one entry.
    act(() => result.current.recordAttempt(mkAttempt(QID_A, false)));
    expect(result.current.state.mistakes).toEqual([QID_A]);
  });

  it("removes from mistakes when later answered correctly", () => {
    const { result } = renderHook(() => usePyqStore());

    act(() => result.current.recordAttempt(mkAttempt(QID_A, false)));
    expect(result.current.state.mistakes).toContain(QID_A);

    act(() => result.current.recordAttempt(mkAttempt(QID_A, true)));
    expect(result.current.state.mistakes).not.toContain(QID_A);
  });

  it("preserves mistakes across simulated shuffle toggle / chapter retry remount", () => {
    const a = renderHook(() => usePyqStore());
    act(() => {
      a.result.current.recordAttempt(mkAttempt(QID_A, false));
      a.result.current.recordAttempt(mkAttempt(QID_B, false));
    });
    expect(a.result.current.state.mistakes).toEqual(
      expect.arrayContaining([QID_A, QID_B]),
    );

    // Shuffle toggle / Retry both re-mount the practice screen → new hook read.
    const remount = renderHook(() => usePyqStore());
    expect(remount.result.current.state.mistakes).toEqual(
      expect.arrayContaining([QID_A, QID_B]),
    );
  });

  it("mistake entries are keyed by question id, not position, so shuffled order is irrelevant", () => {
    const { result } = renderHook(() => usePyqStore());

    // Simulate answering questions in one order...
    act(() => {
      result.current.recordAttempt(mkAttempt(QID_A, false));
      result.current.recordAttempt(mkAttempt(QID_B, true));
    });
    const first = [...result.current.state.mistakes];

    // ...then in the opposite (shuffled) order — net truth is the same set.
    act(() => {
      result.current.recordAttempt(mkAttempt(QID_B, true));
      result.current.recordAttempt(mkAttempt(QID_A, false));
    });
    expect(result.current.state.mistakes.sort()).toEqual(first.sort());
  });

  it("toggling a bookmark does not add or remove mistake entries", () => {
    const { result } = renderHook(() => usePyqStore());

    act(() => result.current.recordAttempt(mkAttempt(QID_A, false)));
    act(() => result.current.toggleBookmark(QID_A));
    act(() => result.current.toggleBookmark(QID_A));

    expect(result.current.state.mistakes).toEqual([QID_A]);
  });
});
