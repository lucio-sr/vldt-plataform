import type { PillarType, PillarStatus, ConfidenceLevel } from "@labvie/domain";

/** Rótulos de founder + letra AEIOU por etapa (PRD §1, Apêndice B). */
export const PILLAR_META: Record<
  PillarType,
  { letter: string; founder: string; benefit: string }
> = {
  setup: { letter: "·", founder: "Setup", benefit: "Enquadrar a pesquisa" },
  ambiente: { letter: "A", founder: "O terreno", benefit: "Enxergar onde há espaço real" },
  estrategia: { letter: "E", founder: "Sua aposta", benefit: "Trocar palpite por apostas testáveis" },
  interacoes: { letter: "I", founder: "Seus clientes", benefit: "Não construir o que ninguém quer" },
  operacoes: { letter: "O", founder: "A entrega", benefit: "Entregar consistente sem peso cedo demais" },
  unificacao: { letter: "U", founder: "O time", benefit: "Tirar a aposta do papel" },
  sintese: { letter: "∑", founder: "Sua tese", benefit: "Decidir, alinhar sócios, captar" },
};

export const PILLAR_ORDER: PillarType[] = [
  "setup", "ambiente", "estrategia", "interacoes", "operacoes", "unificacao", "sintese",
];

export const STATUS_LABEL: Record<PillarStatus, string> = {
  nao_iniciada: "Não iniciada",
  em_pesquisa: "Em pesquisa",
  em_dialogo: "Em diálogo",
  pronta_para_gate: "Pronta para gate",
  concluida: "Concluída",
  arquivada: "Arquivada",
};

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  forte: "Evidência forte",
  media: "Evidência média",
  fraca: "Evidência fraca",
  lacuna: "Lacuna",
};
