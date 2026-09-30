import Anthropic from "@anthropic-ai/sdk";

import {
  SummaryError,
  type LlmRequest,
  type LlmResult,
  type SummaryLlm,
} from "./model";

/**
 * `effort` is accepted by Opus/Sonnet 4.6+ and the 5.x models only (Haiku 4.5
 * and older reject it), so it is skipped for other `SUMMARY_MODEL` overrides.
 */
export function supportsEffort(model: string): boolean {
  return /^claude-(opus-(4-[6-9]|5)|sonnet-(4-6|5)|fable|mythos)/.test(model);
}

/**
 * Anthropic-backed `SummaryLlm`. Structured output (`output_config.format`)
 * keeps the JSON valid; low effort keeps thinking cost small for a digest.
 * One attempt (`maxRetries: 0`) so a slow call cannot outlive the function.
 */
export function createAnthropicLlm(apiKey: string): SummaryLlm {
  const client = new Anthropic({ apiKey, timeout: 50_000, maxRetries: 0 });

  return {
    async complete(request: LlmRequest): Promise<LlmResult> {
      try {
        const outputConfig: Anthropic.OutputConfig = {
          format: { type: "json_schema", schema: request.schema },
        };
        if (supportsEffort(request.model)) outputConfig.effort = "low";
        const response = await client.messages.create({
          model: request.model,
          max_tokens: request.maxTokens,
          system: request.system,
          messages: [{ role: "user", content: request.user }],
          output_config: outputConfig,
        });
        const text = response.content
          .flatMap((block) => (block.type === "text" ? [block.text] : []))
          .join("");
        const usage = response.usage;
        return {
          text,
          inputTokens:
            usage.input_tokens +
            (usage.cache_creation_input_tokens ?? 0) +
            (usage.cache_read_input_tokens ?? 0),
          outputTokens: usage.output_tokens,
          stopReason: response.stop_reason,
        };
      } catch (error) {
        if (error instanceof Anthropic.APIError) {
          throw new SummaryError(
            "unavailable",
            `Anthropic API error ${error.status ?? "network"}`
          );
        }
        throw error;
      }
    },
  };
}
