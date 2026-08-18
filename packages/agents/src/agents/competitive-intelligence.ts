import type { LlmProvider } from "../llm/provider.js";
import { modelForRole } from "../llm/router.js";
import type { Embedder } from "../rag/embeddings.js";
import type { Retriever } from "../rag/retriever.js";
import {
  type AgentRunRecord,
  type CompetitiveIntelOutput,
  type PillarContext,
  competitiveIntelOutput,
  makeRun,
  parseLlmJson,
} from "./types.js";

const SYSTEM =
  "Você é o agente de Competitive Intelligence do Labvie. Extrai movimentos de concorrentes nos " +
  "últimos 24 meses: pricing, contratações, narrativas, lançamentos. Responda SOMENTE com JSON válido.";

export async function runCompetitiveIntelligence(
  provider: LlmProvider,
  retriever: Retriever,
  embedder: Embedder,
  ctx: PillarContext,
): Promise<{ output: CompetitiveIntelOutput; run: AgentRunRecord }> {
  const queryEmbedding = await embedder.embed(`concorrência ${ctx.pillarType}: ${ctx.motherQuestion}`);
  const chunks = await retriever.retrieve(queryEmbedding, 6, ctx.projectId);
  const context = chunks.map((c) => `• [${c.source_type}] ${c.content}`).join("\n");
  const model = modelForRole("competitive_intelligence");
  const user =
    `Etapa: ${ctx.pillarType}\nCorpus recuperado:\n${context || "(vazio)"}\n\n` +
    `Produza JSON { competitors:[{name,recent_moves,pricing,narrative}], implications:[] }.`;

  const res = await provider.generate(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    { model, json: true, tag: "competitive_intelligence" },
  );
  return { output: parseLlmJson(competitiveIntelOutput, res.text), run: makeRun("competitive_intelligence", res) };
}
