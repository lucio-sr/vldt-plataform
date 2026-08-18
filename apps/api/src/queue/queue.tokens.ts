/** Fila de pesquisa assíncrona (PRD §14: pesquisa longa, retomável, não-bloqueante). */
export const RESEARCH_QUEUE = "RESEARCH_QUEUE";
export const RESEARCH_QUEUE_NAME = "research";

/** Job dummy (Fase A). */
export interface ResearchPingJob {
  kind: "ping";
  message: string;
  at: string;
}

/** Job real (Fase C): roda o loop de uma etapa via Coordenador de agentes. */
export interface PillarResearchJob {
  kind: "pillar.research";
  projectId: string;
  pillarType: string;
  motherQuestion: string;
}

/** Job de análise de entrevista (User Research). */
export interface InterviewAnalyzeJob {
  kind: "interview.analyze";
  projectId: string;
  interviewId: string;
}

export type ResearchJob = ResearchPingJob | PillarResearchJob | InterviewAnalyzeJob;
