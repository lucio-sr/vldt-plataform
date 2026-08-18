import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { describe, expect, it } from "vitest";
import { runPillar } from "./agents/coordinator.js";
import { MockProvider } from "./llm/mock.js";
import { MockEmbedder } from "./rag/embeddings.js";
import { type RetrievedChunk, pgvectorRetriever, toVectorLiteral } from "./rag/retriever.js";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../db/migrations");

async function setup() {
  const pg = new PGlite({ extensions: { vector } });
  await pg.exec(readFileSync(join(migrationsDir, "0001_init_domain.sql"), "utf8"));

  const embedder = new MockEmbedder();
  const corpus = [
    "Resultados do SAEB pressionam gestores municipais por alfabetização.",
    "FUNDEB carimba grande parte da verba para pessoal, não tecnologia.",
    "Ciclo de compra B2G municipal é longo e político.",
  ];
  for (const content of corpus) {
    const emb = toVectorLiteral(await embedder.embed(content));
    await pg.query(`INSERT INTO rag_chunks (source_type, content, embedding) VALUES ('caso', $1, $2::vector)`, [
      content,
      emb,
    ]);
  }
  const exec = (sql: string, params: unknown[]) => pg.query<RetrievedChunk>(sql, params);
  return { retriever: pgvectorRetriever(exec), embedder, provider: new MockProvider() };
}

describe("pipeline de agentes (Coordenador) com RAG sobre pgvector", () => {
  it("recupera corpus, confronta e sintetiza — sem API keys", async () => {
    const { retriever, embedder, provider } = await setup();
    const result = await runPillar(
      { provider, retriever, embedder },
      {
        projectId: "00000000-0000-4000-8000-000000000000",
        pillarType: "ambiente",
        motherQuestion: "Existe mercado real e acessível?",
      },
    );

    // RAG trouxe 3 chunks → o agente de pesquisa cita 3 fontes
    expect(result.research.sources.length).toBe(3);
    expect(result.research.gaps.length).toBeGreaterThan(0);
    expect(result.adversarial.provocations.length).toBeGreaterThanOrEqual(2);
    expect(result.synthesis.score).toBeGreaterThanOrEqual(0);
    expect(result.synthesis.score).toBeLessThanOrEqual(100);
    expect(result.synthesis.recommendedLogic).toBe("apostar");
    expect(result.totalCostUsd).toBeGreaterThan(0);
    // "ambiente" é etapa enriquecida → roda competitive + quant
    expect(result.competitive?.competitors.length).toBeGreaterThan(0);
    expect(result.quant?.sizing.som).toBeTruthy();
    expect(result.runs.map((r) => r.agent)).toEqual([
      "background_research",
      "competitive_intelligence",
      "quant_analysis",
      "adversarial",
      "sintetizador",
    ]);
  });
});

describe("User Research — análise de transcrição", () => {
  it("extrai voz-do-cliente, objeções e evidências", async () => {
    const { runUserResearch, MockProvider } = await import("./index.js");
    const { output } = await runUserResearch(new MockProvider(), {
      persona: "secretária de educação",
      transcript: "as crianças chegam ao 5º ano sem ler; a verba é carimbada para pessoal.",
    });
    expect(output.voice_of_customer.length).toBeGreaterThan(0);
    expect(output.objections.length).toBeGreaterThan(0);
    expect(output.evidences.length).toBeGreaterThan(0);
  });
});
