import type { LlmProvider } from "../llm/provider.js";
import { modelForRole } from "../llm/router.js";
import {
  type AdversarialOutput,
  type AgentRunRecord,
  type BackgroundResearchOutput,
  type PillarContext,
  type SynthesizerOutput,
  parseLlmJson,
  synthesizerOutput,
} from "./types.js";

const SYSTEM =
  "Você é o Sintetizador do Labvie. Consolida a tese da etapa em uma claim defensável, atribui " +
  "nível de confiança e score 0–100, recomenda a lógica de decisão (planejar quando há dado para prever; " +
  "apostar quando a incerteza é irredutível) e lista as lacunas que ainda derrubam a tese. " +
  "Responda SOMENTE com JSON válido.";

export async function runSynthesizer(
  provider: LlmProvider,
  ctx: PillarContext,
  research: BackgroundResearchOutput,
  adversarial: AdversarialOutput,
): Promise<{ output: SynthesizerOutput; run: AgentRunRecord }> {
  const model = modelForRole("sintetizador");
  const user =
    `Etapa: ${ctx.pillarType}\n` +
    `Síntese: ${research.synthesis}\n` +
    `Fontes: ${research.sources.length}\n` +
    `Provocações não resolvidas:\n${adversarial.provocations.map((p) => `- ${p.text}`).join("\n")}\n\n` +
    `Produza JSON { claim, confidence, score, recommendedLogic, gaps }. ` +
    `confidence ∈ {forte,media,fraca,lacuna}; recommendedLogic ∈ {planejar,apostar}.`;

  const res = await provider.generate(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    { model, json: true, tag: "sintetizador" },
  );

  return {
    output: parseLlmJson(synthesizerOutput, res.text),
    run: {
      agent: "sintetizador",
      model: res.usage.model,
      inputTokens: res.usage.inputTokens,
      outputTokens: res.usage.outputTokens,
      costUsd: res.usage.costUsd,
    },
  };
}
