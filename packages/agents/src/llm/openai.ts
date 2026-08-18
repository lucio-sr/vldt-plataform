import {
  type LlmGenerateOptions,
  type LlmMessage,
  type LlmProvider,
  type LlmResult,
  computeCostUsd,
} from "./provider.js";

/** Provider OpenAI. Usado em alto volume (Background Research) — ADR 0002 §3.4. */
export class OpenAIProvider implements LlmProvider {
  readonly name = "openai";
  constructor(private readonly apiKey: string = process.env.OPENAI_API_KEY ?? "") {}

  async generate(messages: LlmMessage[], opts: LlmGenerateOptions = {}): Promise<LlmResult> {
    const model = opts.model ?? "gpt-5-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_completion_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature,
        response_format: opts.json ? { type: "json_object" } : undefined,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const inputTokens: number = data.usage?.prompt_tokens ?? 0;
    const outputTokens: number = data.usage?.completion_tokens ?? 0;
    return { text, usage: { model, inputTokens, outputTokens, costUsd: computeCostUsd(model, inputTokens, outputTokens) } };
  }
}
