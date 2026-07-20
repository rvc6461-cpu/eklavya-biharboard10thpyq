import { defineTool } from "@lovable.dev/mcp-js";
import { SUBJECTS } from "@/lib/pyq/data";

export default defineTool({
  name: "list_subjects",
  title: "List subjects",
  description:
    "List all Bihar Board Class 10 subjects available in Eklavya, with their id, name, and number of chapters.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const rows = SUBJECTS.map((s) => ({
      id: s.id,
      name: s.name,
      short: s.short,
      chapterCount: s.chapters.length,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { subjects: rows },
    };
  },
});
