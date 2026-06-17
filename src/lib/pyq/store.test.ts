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
