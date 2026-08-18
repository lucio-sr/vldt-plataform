import type { GateDecisionType, PillarStatus } from "./enums.js";

/**
 * Máquina de estados da etapa (PRD §6.3).
 *
 *   nao_iniciada → em_pesquisa → em_dialogo → pronta_para_gate
 *        → [avancar→concluida | voltar_pesquisar→em_pesquisa | arquivar→arquivada]
 *
 * Loops: uma etapa concluída pode ser reaberta (em_pesquisa) a partir de
 * descoberta posterior (PRD §6.3, §9.2 P1).
 */
export const PILLAR_TRANSITIONS: Record<PillarStatus, readonly PillarStatus[]> = {
  nao_iniciada: ["em_pesquisa", "arquivada"],
  em_pesquisa: ["em_dialogo", "arquivada"],
  em_dialogo: ["pronta_para_gate", "em_pesquisa", "arquivada"],
  pronta_para_gate: ["concluida", "em_pesquisa", "arquivada"],
  concluida: ["em_pesquisa"], // reabertura (loop)
  arquivada: ["em_pesquisa"], // desarquivar
};

export function canTransition(from: PillarStatus, to: PillarStatus): boolean {
  return PILLAR_TRANSITIONS[from].includes(to);
}

/**
 * Efeito de uma decisão de gate sobre o status da etapa (PRD §10.2).
 * Só é válido a partir de `pronta_para_gate`.
 */
export function applyGateDecision(
  current: PillarStatus,
  decision: GateDecisionType,
): PillarStatus {
  if (current !== "pronta_para_gate") {
    throw new Error(
      `gate só pode ser decidido em 'pronta_para_gate' (status atual: '${current}')`,
    );
  }
  switch (decision) {
    case "avancar":
      return "concluida"; // gera nova ThesisVersion (PRD §6.3)
    case "voltar_pesquisar":
      return "em_pesquisa";
    case "arquivar":
      return "arquivada";
  }
}

/** Avançar exige justificativa humana — o humano decide (PRD §5.4). */
export function gateRequiresJustification(): true {
  return true;
}
