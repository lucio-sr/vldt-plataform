import type { LlmProvider } from "../llm/provider.js";
import { modelForRole } from "../llm/router.js";
import {
  type AgentRunRecord,
  type UserResearchOutput,
  makeRun,
  parseLlmJson,
  userResearchOutput,
} from "./types.js";

const SYSTEM =
  "Você é o agente de User Research do Labvie. Analisa transcrições de entrevista e extrai voz-do-cliente, " +
  "objeções, padrões e contradições, transformando trechos citáveis em evidências. Responda SOMENTE com JSON válido.";

export interface InterviewAnalysisContext {
  persona?: string;
  transcript: string;
}

export async function runUserResearch(
  provider: LlmProvider,
  ctx: InterviewAnalysisContext,
): Promise<{ output: UserResearchOutput; run: AgentRunRecord }> {
  const model = modelForRole("user_research");
  const user =
    `Persona: ${ctx.persona ?? "(não informada)"}\n` +
    `Transcrição:\n${ctx.transcript}\n\n` +
    `Produza JSON { voice_of_customer:[], objections:[], patterns:[], evidences:[{title,excerpt,confidence}] }. ` +
    `confidence ∈ {forte,media,fraca,lacuna}.`;

  const res = await provider.generate(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    { model, json: true, tag: "user_research" },
  );
  return { output: parseLlmJson(userResearchOutput, res.text), run: makeRun("user_research", res) };
}
