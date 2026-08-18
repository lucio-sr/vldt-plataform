/** Camada de LLM — interface comum + pricing + custo (ADR 0002 §3.4). */

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmGenerateOptions {
  model?: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
  /** Dica de papel/agente — usada pelo MockProvider; ignorada pelos reais. */
  tag?: string;
}

export interface LlmUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface LlmResult {
  text: string;
  usage: LlmUsage;
}

export interface LlmProvider {
  readonly name: string;
  generate(messages: LlmMessage[], opts?: LlmGenerateOptions): Promise<LlmResult>;
}

/** Preços por 1M tokens (input/output), verificados 23/06/2026 — ADR 0002 §3.4. */
export const MODEL_PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
  "gpt-5-mini": { in: 0.25, out: 2 },
  "gpt-5.4-mini": { in: 0.75, out: 4.5 },
};

export function computeCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = MODEL_PRICING[model] ?? { in: 0, out: 0 };
  return (inputTokens * p.in + outputTokens * p.out) / 1_000_000;
}

/** Estimativa grosseira de tokens (~4 chars/token) para telemetria sem chamada real. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
