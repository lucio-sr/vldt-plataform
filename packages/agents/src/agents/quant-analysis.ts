import type { LlmProvider } from "../llm/provider.js";
import { modelForRole } from "../llm/router.js";
import type { Embedder } from "../rag/embeddings.js";
import type { Retriever } from "../rag/retriever.js";
import {
  type AgentRunRecord,
  type PillarContext,
  type QuantAnalysisOutput,
  makeRun,
  parseLlmJson,
  quantAnalysisOutput,
} from "./types.js";

const SYSTEM =
  "Você é o agente de Quant Analysis do Labvie. Faz sizing triangulado (TAM/SAM/SOM com premissas), " +
  "unit economics e análise de sensibilidade. Seja explícito nas premissas. Responda SOMENTE com JSON válido.";

export async function runQuantAnalysis(
  provider: LlmProvider,
  retriever: Retriever,
  embedder: Embedder,
  ctx: PillarContext,
): Promise<{ output: QuantAnalysisOutput; run: AgentRunRecord }> {
  const queryEmbedding = await embedder.embed(`tamanho de mercado e economics ${ctx.pillarType}: ${ctx.motherQuestion}`);
  const chunks = await retriever.retrieve(queryEmbedding, 6, ctx.projectId);
  const context = chunks.map((c) => `• [${c.source_type}] ${c.content}`).join("\n");
  const model = modelForRole("quant_analysis");
  const user =
    `Etapa: ${ctx.pillarType}\nCorpus recuperado:\n${context || "(vazio)"}\n\n` +
    `Produza JSON { sizing:{tam,sam,som,assumptions:[]}, unit_economics:[], sensitivity:[] }.`;

  const res = await provider.generate(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    { model, json: true, tag: "quant_analysis" },
  );
  return { output: parseLlmJson(quantAnalysisOutput, res.text), run: makeRun("quant_analysis", res) };
}
