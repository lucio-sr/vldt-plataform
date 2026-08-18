import { z } from "zod";
import { confidenceLevel, decisionLogic } from "@labvie/domain";
import type { LlmResult } from "../llm/provider.js";

/** Schemas de saída dos agentes (validados em runtime — outputs de LLM). */

export const backgroundResearchOutput = z.object({
  synthesis: z.string(),
  sources: z.array(
    z.object({ title: z.string(), origin: z.string(), confidence: confidenceLevel }),
  ),
  gaps: z.array(z.string()),
});
export type BackgroundResearchOutput = z.infer<typeof backgroundResearchOutput>;

export const adversarialOutput = z.object({
  provocations: z.array(z.object({ kind: z.string(), text: z.string() })).min(1),
});
export type AdversarialOutput = z.infer<typeof adversarialOutput>;

export const synthesizerOutput = z.object({
  claim: z.string(),
  confidence: confidenceLevel,
  score: z.number().int().min(0).max(100),
  recommendedLogic: decisionLogic,
  gaps: z.array(z.string()),
});
export type SynthesizerOutput = z.infer<typeof synthesizerOutput>;

export const competitiveIntelOutput = z.object({
  competitors: z.array(
    z.object({
      name: z.string(),
      recent_moves: z.array(z.string()),
      pricing: z.string().nullish(),
      narrative: z.string().nullish(),
    }),
  ),
  implications: z.array(z.string()),
});
export type CompetitiveIntelOutput = z.infer<typeof competitiveIntelOutput>;

export const quantAnalysisOutput = z.object({
  sizing: z.object({
    tam: z.string().nullish(),
    sam: z.string().nullish(),
    som: z.string().nullish(),
    assumptions: z.array(z.string()),
  }),
  unit_economics: z.array(z.string()),
  sensitivity: z.array(z.string()),
});
export type QuantAnalysisOutput = z.infer<typeof quantAnalysisOutput>;

export const userResearchOutput = z.object({
  voice_of_customer: z.array(z.string()),
  objections: z.array(z.string()),
  patterns: z.array(z.string()),
  evidences: z.array(z.object({ title: z.string(), excerpt: z.string(), confidence: confidenceLevel })),
});
export type UserResearchOutput = z.infer<typeof userResearchOutput>;

export interface PillarContext {
  projectId: string;
  pillarType: string;
  motherQuestion: string;
}

export interface AgentRunRecord {
  agent: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface PillarResult {
  research: BackgroundResearchOutput;
  competitive?: CompetitiveIntelOutput;
  quant?: QuantAnalysisOutput;
  adversarial: AdversarialOutput;
  synthesis: SynthesizerOutput;
  runs: AgentRunRecord[];
  totalCostUsd: number;
}

/** Monta o registro de telemetria (AgentRun) a partir do resultado do LLM. */
export function makeRun(agent: string, res: LlmResult): AgentRunRecord {
  return {
    agent,
    model: res.usage.model,
    inputTokens: res.usage.inputTokens,
    outputTokens: res.usage.outputTokens,
    costUsd: res.usage.costUsd,
  };
}

/** Extrai JSON do texto do LLM (tolerante a cercas ```json). */
export function parseLlmJson<T>(schema: z.ZodType<T>, text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return schema.parse(JSON.parse(cleaned));
}
