import type { LlmProvider } from "../llm/provider.js";
import { modelForRole } from "../llm/router.js";
import type { Embedder } from "../rag/embeddings.js";
import type { Retriever } from "../rag/retriever.js";
import {
  type AgentRunRecord,
  type BackgroundResearchOutput,
  type PillarContext,
  backgroundResearchOutput,
  parseLlmJson,
} from "./types.js";

const SYSTEM =
  "Você é o agente de Background Research do Labvie, um copesquisador estratégico. " +
  "Pesquisa de base com rastreabilidade: toda afirmação tem fonte; lacunas são explícitas. " +
  "Responda SOMENTE com JSON válido conforme o schema pedido.";

export async function runBackgroundResearch(
  provider: LlmProvider,
  retriever: Retriever,
  embedder: Embedder,
  ctx: PillarContext,
): Promise<{ output: BackgroundResearchOutput; run: AgentRunRecord }> {
  const queryEmbedding = await embedder.embed(`${ctx.pillarType}: ${ctx.motherQuestion}`);
  const chunks = await retriever.retrieve(queryEmbedding, 6, ctx.projectId);
  const contextBlock = chunks.map((c) => `• [${c.source_type}] ${c.content}`).join("\n");
  const model = modelForRole("background_research");

  const user =
    `Etapa: ${ctx.pillarType}\n` +
    `Pergunta-mãe: ${ctx.motherQuestion}\n` +
    `CONTEXT_ITEMS=${chunks.length}\n` +
    `Corpus recuperado:\n${contextBlock || "(vazio)"}\n\n` +
    `Produza JSON { synthesis, sources:[{title,origin,confidence}], gaps:[] }. ` +
    `confidence ∈ {forte,media,fraca,lacuna}. Marque lacuna quando não houver evidência.`;

  const res = await provider.generate(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    { model, json: true, tag: "background_research" },
  );

  return {
    output: parseLlmJson(backgroundResearchOutput, res.text),
    run: {
      agent: "background_research",
      model: res.usage.model,
      inputTokens: res.usage.inputTokens,
      outputTokens: res.usage.outputTokens,
      costUsd: res.usage.costUsd,
    },
  };
}
