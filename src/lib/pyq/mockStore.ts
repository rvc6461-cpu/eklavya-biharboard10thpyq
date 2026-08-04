// Phase 2B – local storage for mock test attempts, best performance and
// attempt history. Purely additive; does not touch practice/PYQ storage.

export const MOCK_TESTS_PER_SUBJECT = 10;
export const MOCK_TARGET = 100;

export type MockAttempt = {
  id: string;
  subjectId: string;
  subjectName: string;
  testNo: number;
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  score: number;
  accuracy: number;
  timeTakenSeconds: number;
  at: number;
};

export type MockBest = {
  attempts: number;
  bestScore: number;
  bestAccuracy: number;
  fastestSeconds: number | null;
  lastAttemptAt: number | null;
};

const KEY = "eklavya.mockhistory.v1";

function read(): MockAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as MockAttempt[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(rows: MockAttempt[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rows.slice(-500)));
  } catch {
    /* quota */
  }
}

export function saveAttempt(a: Omit<MockAttempt, "id">): MockAttempt {
  const row: MockAttempt = { ...a, id: `${a.subjectId}-${a.testNo}-${a.at}` };
  write([...read(), row]);
  return row;
}

export function listAttempts(subjectId?: string, testNo?: number): MockAttempt[] {
  return read()
    .filter((r) => (subjectId ? r.subjectId === subjectId : true))
    .filter((r) => (testNo ? r.testNo === testNo : true))
    .sort((a, b) => b.at - a.at);
}

export function bestFor(subjectId: string, testNo: number): MockBest {
  const rows = listAttempts(subjectId, testNo);
  if (!rows.length) {
    return { attempts: 0, bestScore: 0, bestAccuracy: 0, fastestSeconds: null, lastAttemptAt: null };
  }
  return {
    attempts: rows.length,
    bestScore: Math.max(...rows.map((r) => r.score)),
    bestAccuracy: Math.max(...rows.map((r) => r.accuracy)),
    fastestSeconds: Math.min(...rows.map((r) => r.timeTakenSeconds)),
    lastAttemptAt: Math.max(...rows.map((r) => r.at)),
  };
}

// Deterministic per-test shuffle so different mock tests draw from different
// regions of the question bank, minimising cross-test repetition, while each
// attempt still gets a fresh random combination from that region.
function seededShuffle(ids: string[], seed: number): string[] {
  const a = ids.slice();
  let s = seed * 2654435761 + 12345;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomShuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick up to 100 unique question ids for a given mock test number. */
export function pickTestQuestionIds(allIds: string[], testNo: number): string[] {
  const unique = Array.from(new Set(allIds));
  if (unique.length <= MOCK_TARGET) return randomShuffle(unique);

  const base = seededShuffle(unique, testNo);
  const start = ((testNo - 1) * MOCK_TARGET) % base.length;
  // Widened window (~2x target) so each attempt differs, rotating per test.
  const windowSize = Math.min(base.length, MOCK_TARGET * 2);
  const window: string[] = [];
  for (let i = 0; i < windowSize; i++) window.push(base[(start + i) % base.length]);
  const picked = randomShuffle(Array.from(new Set(window))).slice(0, MOCK_TARGET);
  if (picked.length === MOCK_TARGET) return picked;
  // Top up from the rest of the bank if the window was short.
  const chosen = new Set(picked);
  for (const id of randomShuffle(base)) {
    if (picked.length >= MOCK_TARGET) break;
    if (!chosen.has(id)) { chosen.add(id); picked.push(id); }
  }
  return picked;
}
