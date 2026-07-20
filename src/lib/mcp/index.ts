import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSubjects from "./tools/list-subjects";
import listChapters from "./tools/list-chapters";
import listQuestions from "./tools/list-questions";
import searchQuestions from "./tools/search-questions";

// Direct Supabase issuer — NOT the .lovable.cloud proxy — required by RFC 8414
// issuer matching. VITE_SUPABASE_PROJECT_ID is inlined at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "eklavya-mcp",
  title: "Eklavya – Bihar Board 10th",
  version: "0.1.0",
  instructions:
    "Read-only access to Eklavya's Bihar Board Class 10 study bank. Use list_subjects → list_chapters → list_questions to browse chapter-wise PYQs, or search_questions to search across every subject.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listSubjects, listChapters, listQuestions, searchQuestions],
});
