import {
  type LlmGenerateOptions,
  type LlmMessage,
  type LlmProvider,
  type LlmResult,
  computeCostUsd,
} from "./provider.js";

/** Provider Anthropic (Claude). Usado em Adversarial/Sintetizador (ADR 0002 §3.4). */
export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  constructor(private readonly apiKey: string = process.env.ANTHROPIC_API_KEY ?? "") {}

  async generate(messages: LlmMessage[], opts: LlmGenerateOptions = {}): Promise<LlmResult> {
    const model = opts.model ?? "claude-sonnet-4-6";
    const system = opts.system ?? messages.find((m) => m.role === "system")?.content;
    const chat = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature,
        system,
        messages: chat,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    const text: string = (data.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
    const inputTokens: number = data.usage?.input_tokens ?? 0;
    const outputTokens: number = data.usage?.output_tokens ?? 0;
    return { text, usage: { model, inputTokens, outputTokens, costUsd: computeCostUsd(model, inputTokens, outputTokens) } };
  }
}
