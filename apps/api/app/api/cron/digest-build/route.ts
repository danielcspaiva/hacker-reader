import { handleDigestBuildCron } from "@/lib/digest/build";
import { getStore } from "@/lib/store";
import { createAnthropicLlm } from "@/lib/summaries/anthropic";

// One model call plus one Algolia query; well inside the limit.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return handleDigestBuildCron(req, {
    store: getStore(),
    llm: apiKey ? createAnthropicLlm(apiKey) : undefined,
  });
}
