// Phase 3 – PDF Library data helpers (previous year papers, formula sheets, premium notes).
import { supabase } from "@/integrations/supabase/client";

export type ResourceType = "pyq_paper" | "formula_sheet" | "premium_note";

export type LibraryResource = {
  id: string;
  title: string;
  description: string | null;
  subject_id: string | null;
  chapter_id: string | null;
  pdf_url: string;
  is_premium: boolean;
  is_published: boolean;
  resource_type: ResourceType;
  year: number | null;
  created_at: string;
};

export const PYQ_YEARS = [2026, 2025, 2024, 2023, 2022, 2021];

export async function fetchResources(type?: ResourceType): Promise<LibraryResource[]> {
  let q = supabase.from("notes").select("*").eq("is_published", true);
  if (type) q = q.eq("resource_type", type);
  const { data, error } = await q.order("year", { ascending: false }).order("created_at", { ascending: false });
  if (error) console.log("[Library] resources query", { type, error });
  return (data ?? []) as unknown as LibraryResource[];
}

export async function fetchResourceById(id: string): Promise<LibraryResource | null> {
  const { data } = await supabase.from("notes").select("*").eq("id", id).maybeSingle();
  return (data as unknown as LibraryResource) ?? null;
}

export async function signedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from("notes").createSignedUrl(path, expiresIn);
  if (error) console.log("[Library] signed url error", error);
  return data?.signedUrl ?? null;
}

/* ---------- offline download tracking (device-local) ---------- */
const DL_KEY = "eklavya.library.downloads";

function readDownloads(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DL_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function isDownloaded(id: string): boolean {
  return readDownloads().includes(id);
}

export function markDownloaded(id: string) {
  const list = readDownloads();
  if (!list.includes(id)) localStorage.setItem(DL_KEY, JSON.stringify([...list, id]));
}

export async function downloadResource(res: LibraryResource): Promise<void> {
  const url = await signedUrl(res.pdf_url);
  if (!url) throw new Error("File unavailable");
  const blob = await (await fetch(url)).blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `${res.title.replace(/[^\w\s.-]/g, "")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
  markDownloaded(res.id);
}
