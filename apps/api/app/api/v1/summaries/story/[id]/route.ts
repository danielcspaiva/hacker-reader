import { getStore } from "@/lib/store";
import { createAnthropicLlm } from "@/lib/summaries/anthropic";
import { handleStorySummary } from "@/lib/summaries/handler";

// Generation takes 10-20s; give the function room.
export const maxDuration = 60;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { id } = await params;
  return handleStorySummary(req, id, {
    store: getStore(),
    llm: apiKey ? createAnthropicLlm(apiKey) : undefined,
  });
}
