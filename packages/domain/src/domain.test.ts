import { describe, expect, it } from "vitest";
import {
  applyGateDecision,
  canTransition,
  createProjectSchema,
  evidenceSchema,
  gateDecisionSchema,
  pillarStatus,
  pillarType,
  projectSchema,
  thesisVersionSchema,
} from "./index.js";

const UUID = "00000000-0000-4000-8000-000000000000";

describe("enums espelham a migration", () => {
  it("pillarType tem as 5 letras AEIOU + setup + sintese", () => {
    expect(pillarType.options).toEqual([
      "setup",
      "ambiente",
      "estrategia",
      "interacoes",
      "operacoes",
      "unificacao",
      "sintese",
    ]);
  });

  it("pillarStatus segue a máquina de estados §6.3", () => {
    expect(pillarStatus.options).toContain("pronta_para_gate");
    expect(pillarStatus.options).toContain("em_dialogo");
  });
});

describe("createProjectSchema", () => {
  it("aceita um projeto mínimo válido", () => {
    const r = createProjectSchema.safeParse({ name: "COBRA" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.mode).toBe("solo"); // default
  });

  it("rejeita nome vazio", () => {
    expect(createProjectSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejeita one-liner acima de 280 chars", () => {
    expect(
      createProjectSchema.safeParse({ name: "x", oneLiner: "a".repeat(281) }).success,
    ).toBe(false);
  });
});

describe("projectSchema", () => {
  it("coage timestamps de string ISO para Date", () => {
    const r = projectSchema.safeParse({
      id: UUID,
      name: "Labvie",
      ownerId: UUID,
      mode: "solo",
      status: "ativo",
      createdAt: "2026-06-23T00:00:00.000Z",
      updatedAt: "2026-06-23T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.createdAt).toBeInstanceOf(Date);
  });
});

describe("evidenceSchema — rastreabilidade", () => {
  it("exige tipo e título", () => {
    const r = evidenceSchema.safeParse({
      id: UUID,
      projectId: UUID,
      type: "paper",
      title: "Estudo X",
      confidence: "forte",
      createdAt: "2026-06-23T00:00:00Z",
      updatedAt: "2026-06-23T00:00:00Z",
    });
    expect(r.success).toBe(true);
  });
});

describe("gateDecisionSchema — o humano decide (§5.4)", () => {
  it("exige justificativa", () => {
    const r = gateDecisionSchema.safeParse({
      id: UUID,
      pillarId: UUID,
      decision: "avancar",
      justification: "",
      authorId: UUID,
      createdAt: "2026-06-23T00:00:00Z",
    });
    expect(r.success).toBe(false);
  });
});

describe("thesisVersionSchema — versão como cidadã de 1ª classe", () => {
  it("valida label vX.Y", () => {
    const base = {
      id: UUID,
      projectId: UUID,
      snapshot: {},
      createdAt: "2026-06-23T00:00:00Z",
    };
    expect(thesisVersionSchema.safeParse({ ...base, versionLabel: "v0.1" }).success).toBe(true);
    expect(thesisVersionSchema.safeParse({ ...base, versionLabel: "0.1" }).success).toBe(false);
  });
});

describe("máquina de estados da etapa (§6.3)", () => {
  it("permite nao_iniciada → em_pesquisa", () => {
    expect(canTransition("nao_iniciada", "em_pesquisa")).toBe(true);
  });

  it("proíbe pular nao_iniciada → pronta_para_gate", () => {
    expect(canTransition("nao_iniciada", "pronta_para_gate")).toBe(false);
  });

  it("permite reabrir etapa concluída (loop)", () => {
    expect(canTransition("concluida", "em_pesquisa")).toBe(true);
  });

  it("avancar a partir de pronta_para_gate → concluida", () => {
    expect(applyGateDecision("pronta_para_gate", "avancar")).toBe("concluida");
  });

  it("voltar_pesquisar → em_pesquisa", () => {
    expect(applyGateDecision("pronta_para_gate", "voltar_pesquisar")).toBe("em_pesquisa");
  });

  it("lança erro se gate for decidido fora de pronta_para_gate", () => {
    expect(() => applyGateDecision("em_pesquisa", "avancar")).toThrow();
  });
});
