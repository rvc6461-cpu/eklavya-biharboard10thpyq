import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { SUBJECTS } from "@/lib/pyq/data";

export default defineTool({
  name: "list_chapters",
  title: "List chapters",
  description:
    "List all chapters for a given subject id. Returns chapter id, name, and question count for each.",
  inputSchema: {
    subjectId: z.string().min(1).describe("Subject id from list_subjects, e.g. 'math' or 'sanskrit'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ subjectId }) => {
    const subject = SUBJECTS.find((s) => s.id === subjectId);
    if (!subject) {
      return {
        content: [{ type: "text", text: `Unknown subjectId '${subjectId}'.` }],
        isError: true,
      };
    }
    const rows = subject.chapters.map((c) => ({
      id: c.id,
      name: c.name,
      questionCount: c.questions.length,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { subjectId, chapters: rows },
    };
  },
});
