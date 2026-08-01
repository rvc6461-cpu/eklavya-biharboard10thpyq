// Supabase-backed reads for the practice hierarchy:
// Subject → Sub Subject → Chapter → Practice Sets → Questions.
// The UI keeps its offline-friendly Question shape via `toClientQuestion`.
import { supabase } from "@/integrations/supabase/client";
import type { Question } from "./data";

export type DbSubject = {
  id: string;
  slug: string;
  name: string;
  short: string;
  glyph: string;
  hue: string;
  sort_order: number;
  is_active: boolean;
};

export type DbSubSubject = {
  id: string;
  subject_id: string;
  slug: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type DbChapter = {
  id: string;
  subject_id: string;
  sub_subject_id: string | null;
  slug: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type DbQuestion = {
  id: string;
  subject_id: string;
  chapter_id: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: number;
  year: number | null;
  explanation: string | null;
  status: "draft" | "published";
  language?: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string) => UUID_RE.test(v);

export function toClientQuestion(row: DbQuestion): Question {
  return {
    id: row.id,
    year: row.year ?? 0,
    text: row.text,
    options: [row.option_a, row.option_b, row.option_c, row.option_d],
    answer: row.correct_answer,
    explanation: row.explanation ?? "",
  };
}

export async function fetchSubjects(): Promise<DbSubject[]> {
  const { data } = await supabase
    .from("subjects")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as DbSubject[];
}

export async function fetchSubjectBySlugOrId(idOrSlug: string): Promise<DbSubject | null> {
  const { data } = await supabase
    .from("subjects")
    .select("*")
    .eq(isUuid(idOrSlug) ? "id" : "slug", idOrSlug)
    .maybeSingle();
  return (data as DbSubject) ?? null;
}

export async function fetchSubSubjects(subjectId: string): Promise<DbSubSubject[]> {
  const { data } = await supabase
    .from("sub_subjects")
    .select("*")
    .eq("subject_id", subjectId)
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as DbSubSubject[];
}

export async function fetchSubSubjectBySlugOrId(
  subjectId: string,
  idOrSlug: string,
): Promise<DbSubSubject | null> {
  const { data } = await supabase
    .from("sub_subjects")
    .select("*")
    .eq("subject_id", subjectId)
    .eq(isUuid(idOrSlug) ? "id" : "slug", idOrSlug)
    .maybeSingle();
  return (data as DbSubSubject) ?? null;
}

export async function fetchChaptersBySubject(subjectId: string): Promise<DbChapter[]> {
  const { data } = await supabase
    .from("chapters")
    .select("*")
    .eq("subject_id", subjectId)
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as DbChapter[];
}

export async function fetchChaptersBySubSubject(subSubjectId: string): Promise<DbChapter[]> {
  const { data } = await supabase
    .from("chapters")
    .select("*")
    .eq("sub_subject_id", subSubjectId)
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as DbChapter[];
}

export async function fetchChapterBySlugOrId(
  subjectId: string,
  idOrSlug: string,
): Promise<DbChapter | null> {
  const { data } = await supabase
    .from("chapters")
    .select("*")
    .eq("subject_id", subjectId)
    .eq(isUuid(idOrSlug) ? "id" : "slug", idOrSlug)
    .maybeSingle();
  return (data as DbChapter) ?? null;
}

export async function fetchChapterQuestions(chapterId: string): Promise<Question[]> {
  const { data } = await supabase
    .from("questions")
    .select("*")
    .eq("chapter_id", chapterId)
    .eq("status", "published")
    .order("created_at", { ascending: true });
  return ((data ?? []) as DbQuestion[]).map(toClientQuestion);
}

export async function fetchQuestionsByIds(ids: string[]): Promise<DbQuestion[]> {
  if (!ids.length) return [];
  const { data } = await supabase.from("questions").select("*").in("id", ids);
  return (data ?? []) as DbQuestion[];
}

export async function fetchLookupMaps() {
  const [subjRes, subSubRes, chapRes] = await Promise.all([
    supabase.from("subjects").select("id,name,slug,hue,glyph"),
    supabase.from("sub_subjects").select("id,name,slug,subject_id"),
    supabase.from("chapters").select("id,name,slug,subject_id,sub_subject_id"),
  ]);
  const subjects = Object.fromEntries((subjRes.data ?? []).map((s: any) => [s.id, s]));
  const subSubjects = Object.fromEntries((subSubRes.data ?? []).map((s: any) => [s.id, s]));
  const chapters = Object.fromEntries((chapRes.data ?? []).map((c: any) => [c.id, c]));
  return { subjects, subSubjects, chapters };
}
