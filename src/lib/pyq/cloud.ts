// Cloud sync layer for practice progress. Fire-and-forget writes so the
// offline UX stays instant; a signed-out user is a no-op.
import { supabase } from "@/integrations/supabase/client";
import type { AttemptRecord, PyqState } from "./store";
import { SUBJECTS } from "./data";

let currentUserId: string | null = null;

function locateQuestion(questionId: string): { subjectId: string; chapterId: string } | null {
  for (const s of SUBJECTS)
    for (const c of s.chapters)
      for (const q of c.questions)
        if (q.id === questionId) return { subjectId: s.id, chapterId: c.id };
  return null;
}

export function setCloudUser(userId: string | null) {
  currentUserId = userId;
}

export function pushAttempt(a: AttemptRecord) {
  if (!currentUserId) return;
  const uid = currentUserId;
  void supabase.from("attempts").insert({
    user_id: uid,
    question_id: a.questionId,
    subject_id: a.subjectId,
    chapter_id: a.chapterId,
    selected_option: a.selected,
    is_correct: a.correct,
  });
  if (!a.correct) {
    void supabase.from("mistakes").upsert(
      {
        user_id: uid,
        question_id: a.questionId,
        subject_id: a.subjectId,
        chapter_id: a.chapterId,
        wrong_count: 1,
        last_wrong_at: new Date(a.at).toISOString(),
      },
      { onConflict: "user_id,question_id", ignoreDuplicates: false },
    );
  } else {
    void supabase.from("mistakes").delete().eq("user_id", uid).eq("question_id", a.questionId);
  }
}

export function pushBookmark(questionId: string, on: boolean) {
  if (!currentUserId) return;
  const uid = currentUserId;
  const loc = locateQuestion(questionId);
  if (!loc) return;
  if (on) {
    void supabase.from("bookmarks").insert({
      user_id: uid,
      question_id: questionId,
      subject_id: loc.subjectId,
      chapter_id: loc.chapterId,
    });
  } else {
    void supabase.from("bookmarks").delete().eq("user_id", uid).eq("question_id", questionId);
  }
}

export async function saveMockTest(input: {
  subjectId?: string | null;
  testName: string;
  score: number;
  totalQuestions: number;
  timeTakenSeconds: number;
}) {
  if (!currentUserId) return;
  const accuracy = input.totalQuestions > 0 ? (input.score / input.totalQuestions) * 100 : 0;
  await supabase.from("mock_tests").insert({
    user_id: currentUserId,
    subject_id: input.subjectId ?? null,
    test_name: input.testName,
    score: input.score,
    total_questions: input.totalQuestions,
    accuracy,
    percentage: accuracy,
    time_taken_seconds: input.timeTakenSeconds,
  });
}

export async function upsertPracticeSession(subjectId: string, chapterId: string, lastQuestionIndex: number) {
  if (!currentUserId) return;
  await supabase
    .from("practice_sessions")
    .upsert(
      {
        user_id: currentUserId,
        subject_id: subjectId,
        chapter_id: chapterId,
        last_question_index: lastQuestionIndex,
        last_practiced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,subject_id,chapter_id" },
    );
}

export async function getPracticeSession(subjectId: string, chapterId: string) {
  if (!currentUserId) return null;
  const { data } = await supabase
    .from("practice_sessions")
    .select("last_question_index")
    .eq("user_id", currentUserId)
    .eq("subject_id", subjectId)
    .eq("chapter_id", chapterId)
    .maybeSingle();
  return data?.last_question_index ?? null;
}

// One-shot merge on login: pull cloud, union with local, apply back to local
// and upload anything that was local-only.
export async function mergeOnLogin(
  userId: string,
  local: PyqState,
  apply: (next: PyqState) => void,
) {
  currentUserId = userId;
  const [attemptsRes, bookmarksRes, mistakesRes] = await Promise.all([
    supabase.from("attempts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("bookmarks").select("question_id").eq("user_id", userId),
    supabase.from("mistakes").select("question_id").eq("user_id", userId),
  ]);

  const merged: PyqState = {
    attempts: { ...local.attempts },
    bookmarks: Array.from(new Set(local.bookmarks)),
    mistakes: Array.from(new Set(local.mistakes)),
  };

  // Cloud attempts (latest first): keep the most recent per question.
  for (const row of attemptsRes.data ?? []) {
    const existing = merged.attempts[row.question_id];
    const cloudAt = new Date(row.created_at).getTime();
    if (!existing || existing.at < cloudAt) {
      merged.attempts[row.question_id] = {
        questionId: row.question_id,
        subjectId: row.subject_id,
        chapterId: row.chapter_id,
        selected: row.selected_option ?? -1,
        correct: row.is_correct,
        at: cloudAt,
      };
    }
  }

  const cloudBookmarks = new Set((bookmarksRes.data ?? []).map((r) => r.question_id));
  const cloudMistakes = new Set((mistakesRes.data ?? []).map((r) => r.question_id));
  merged.bookmarks = Array.from(new Set([...merged.bookmarks, ...cloudBookmarks]));
  merged.mistakes = Array.from(new Set([...merged.mistakes, ...cloudMistakes]));

  apply(merged);

  // Upload local-only bookmarks & mistakes to the cloud.
  const bookmarksToUpload = merged.bookmarks
    .filter((id) => !cloudBookmarks.has(id))
    .map((questionId) => {
      const loc = locateQuestion(questionId);
      return loc ? { user_id: userId, question_id: questionId, ...{ subject_id: loc.subjectId, chapter_id: loc.chapterId } } : null;
    })
    .filter(Boolean) as Array<{ user_id: string; question_id: string; subject_id: string; chapter_id: string }>;
  if (bookmarksToUpload.length) {
    void supabase.from("bookmarks").upsert(bookmarksToUpload, { onConflict: "user_id,question_id", ignoreDuplicates: true });
  }

  const mistakesToUpload = merged.mistakes
    .filter((id) => !cloudMistakes.has(id))
    .map((questionId) => {
      const loc = locateQuestion(questionId);
      return loc
        ? {
            user_id: userId,
            question_id: questionId,
            subject_id: loc.subjectId,
            chapter_id: loc.chapterId,
            wrong_count: 1,
          }
        : null;
    })
    .filter(Boolean) as Array<{ user_id: string; question_id: string; subject_id: string; chapter_id: string; wrong_count: number }>;
  if (mistakesToUpload.length) {
    void supabase.from("mistakes").upsert(mistakesToUpload, { onConflict: "user_id,question_id", ignoreDuplicates: true });
  }

  // Upload local-only attempts. Cloud attempts are append-only history, so
  // insert one row per local attempt not already represented for that
  // question at that timestamp (approximation: send them all — dupes are
  // harmless history rows).
  const cloudQuestionIds = new Set((attemptsRes.data ?? []).map((r) => r.question_id));
  const attemptsToUpload = Object.values(local.attempts)
    .filter((a) => !cloudQuestionIds.has(a.questionId))
    .map((a) => ({
      user_id: userId,
      question_id: a.questionId,
      subject_id: a.subjectId,
      chapter_id: a.chapterId,
      selected_option: a.selected,
      is_correct: a.correct,
    }));
  if (attemptsToUpload.length) {
    void supabase.from("attempts").insert(attemptsToUpload);
  }
}
