import type { LlmProvider } from "../llm/provider.js";
import type { Embedder } from "../rag/embeddings.js";
import type { Retriever } from "../rag/retriever.js";
import { runAdversarial } from "./adversarial.js";
import { runBackgroundResearch } from "./background-research.js";
import { runCompetitiveIntelligence } from "./competitive-intelligence.js";
import { runQuantAnalysis } from "./quant-analysis.js";
import { runSynthesizer } from "./synthesizer.js";
import type { AgentRunRecord, PillarContext, PillarResult } from "./types.js";

export interface CoordinatorDeps {
  provider: LlmProvider;
  retriever: Retriever;
  embedder: Embedder;
}

/** Etapas que recebem o tratamento enriquecido (competitive + quant). */
const ENRICHED_PILLARS = new Set(["ambiente", "estrategia"]);

/**
 * Orquestra o loop central de uma etapa (PRD §10.2):
 * pesquisa de base (RAG) → [competitive + quant, quando aplicável] →
 * confronto adversarial → síntese versionável. Agrega telemetria de custo.
 */
export async function runPillar(deps: CoordinatorDeps, ctx: PillarContext): Promise<PillarResult> {
  const bg = await runBackgroundResearch(deps.provider, deps.retriever, deps.embedder, ctx);

  let competitive: PillarResult["competitive"];
  let quant: PillarResult["quant"];
  const extraRuns: AgentRunRecord[] = [];

  if (ENRICHED_PILLARS.has(ctx.pillarType)) {
    const [c, q] = await Promise.all([
      runCompetitiveIntelligence(deps.provider, deps.retriever, deps.embedder, ctx),
      runQuantAnalysis(deps.provider, deps.retriever, deps.embedder, ctx),
    ]);
    competitive = c.output;
    quant = q.output;
    extraRuns.push(c.run, q.run);
  }

  const adv = await runAdversarial(deps.provider, ctx, bg.output);
  const syn = await runSynthesizer(deps.provider, ctx, bg.output, adv.output);

  const runs = [bg.run, ...extraRuns, adv.run, syn.run];
  return {
    research: bg.output,
    competitive,
    quant,
    adversarial: adv.output,
    synthesis: syn.output,
    runs,
    totalCostUsd: runs.reduce((sum, r) => sum + r.costUsd, 0),
  };
}
