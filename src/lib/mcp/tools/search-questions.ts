import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { SUBJECTS } from "@/lib/pyq/data";

export default defineTool({
  name: "search_questions",
  title: "Search questions",
  description:
    "Case-insensitive substring search across every PYQ question text in Eklavya. Returns matching questions with their subject and chapter.",
  inputSchema: {
    query: z.string().min(2).describe("Search text, e.g. 'Pythagoras' or 'सन्धि'."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, limit }) => {
    const needle = query.toLowerCase();
    const max = limit ?? 20;
    const hits: Array<Record<string, unknown>> = [];
    for (const s of SUBJECTS) {
      for (const c of s.chapters) {
        for (const q of c.questions) {
          if (q.text.toLowerCase().includes(needle)) {
            hits.push({
              subjectId: s.id,
              subjectName: s.name,
              chapterId: c.id,
              chapterName: c.name,
              question: q,
            });
            if (hits.length >= max) break;
          }
        }
        if (hits.length >= max) break;
      }
      if (hits.length >= max) break;
    }
    return {
      content: [{ type: "text", text: JSON.stringify(hits, null, 2) }],
      structuredContent: { query, count: hits.length, results: hits },
    };
  },
});
