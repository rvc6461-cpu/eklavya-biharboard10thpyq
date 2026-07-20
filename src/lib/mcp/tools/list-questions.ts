import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { SUBJECTS } from "@/lib/pyq/data";

export default defineTool({
  name: "list_questions",
  title: "List questions",
  description:
    "List all previous year questions (PYQ) for a given subject and chapter. Returns each question's id, year, text, options, correct answer index, and explanation.",
  inputSchema: {
    subjectId: z.string().min(1).describe("Subject id from list_subjects."),
    chapterId: z.string().min(1).describe("Chapter id from list_chapters."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ subjectId, chapterId }) => {
    const subject = SUBJECTS.find((s) => s.id === subjectId);
    if (!subject) {
      return { content: [{ type: "text", text: `Unknown subjectId '${subjectId}'.` }], isError: true };
    }
    const chapter = subject.chapters.find((c) => c.id === chapterId);
    if (!chapter) {
      return { content: [{ type: "text", text: `Unknown chapterId '${chapterId}' in ${subjectId}.` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(chapter.questions, null, 2) }],
      structuredContent: { subjectId, chapterId, questions: chapter.questions },
    };
  },
});
