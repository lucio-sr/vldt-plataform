/** Política de mix de modelos por papel de agente (ADR 0002 §3.4). */
export type AgentRole =
  | "coordenador"
  | "background_research"
  | "competitive_intelligence"
  | "user_research"
  | "quant_analysis"
  | "adversarial"
  | "sintetizador";

export const MODEL_BY_ROLE: Record<AgentRole, string> = {
  coordenador: "claude-haiku-4-5",
  background_research: "gpt-5-mini", // alto volume, extração
  competitive_intelligence: "gpt-5.4-mini",
  user_research: "claude-haiku-4-5",
  quant_analysis: "claude-sonnet-4-6",
  adversarial: "claude-sonnet-4-6", // workhorse de raciocínio
  sintetizador: "claude-opus-4-8", // síntese final da tese
};

export function modelForRole(role: AgentRole): string {
  return MODEL_BY_ROLE[role];
}
