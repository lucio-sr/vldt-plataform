import type { LlmProvider } from "../llm/provider.js";
import { modelForRole } from "../llm/router.js";
import {
  type AdversarialOutput,
  type AgentRunRecord,
  type BackgroundResearchOutput,
  type PillarContext,
  adversarialOutput,
  parseLlmJson,
} from "./types.js";

const SYSTEM =
  "Você é o agente Adversarial do Labvie. Confronta a tese antes de concordar: pede estrutura, " +
  "desmonta suposições (X depende de Y, checou Y?), mostra histórico de casos análogos que falharam, " +
  "e olha pra frente (se quebrar em 18 meses, o que vai primeiro?). Tom de sócio honesto, sem bajulação " +
  "e sem jargão. Responda SOMENTE com JSON válido.";

export async function runAdversarial(
  provider: LlmProvider,
  ctx: PillarContext,
  research: BackgroundResearchOutput,
): Promise<{ output: AdversarialOutput; run: AgentRunRecord }> {
  const model = modelForRole("adversarial");
  const user =
    `Etapa: ${ctx.pillarType}\n` +
    `Síntese a confrontar:\n${research.synthesis}\n` +
    `Lacunas declaradas: ${research.gaps.join("; ") || "(nenhuma)"}\n\n` +
    `Produza JSON { provocations:[{kind,text}] } com 2 a 4 provocações afiadas e específicas.`;

  const res = await provider.generate(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    { model, json: true, tag: "adversarial" },
  );

  return {
    output: parseLlmJson(adversarialOutput, res.text),
    run: {
      agent: "adversarial",
      model: res.usage.model,
      inputTokens: res.usage.inputTokens,
      outputTokens: res.usage.outputTokens,
      costUsd: res.usage.costUsd,
    },
  };
}
