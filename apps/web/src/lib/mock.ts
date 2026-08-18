import type {
  ConfidenceLevel,
  DecisionLogic,
  PillarStatus,
  PillarType,
} from "@labvie/domain";

/** Dados mockados para as telas da Fase B (sem backend). */

export interface MockPillar {
  type: PillarType;
  status: PillarStatus;
  score: number | null;
}

export interface MockSource {
  title: string;
  origin: string;
  confidence: ConfidenceLevel;
}

export interface MockProvocation {
  kind: string; // "pede estrutura" | "mostra histórico" | ...
  text: string;
}

export interface MockProject {
  id: string;
  name: string;
  oneLiner: string;
  mode: "solo" | "assistido";
  thesisVersion: string;
  nextMove: string;
  gaps: string[];
  pillars: MockPillar[];
}

export const MOCK_PROJECT: MockProject = {
  id: "cobra",
  name: "COBRA",
  oneLiner: "EdTech B2G para alfabetização baseada em evidência.",
  mode: "assistido",
  thesisVersion: "v0.3",
  nextMove: "Confrontar o tamanho de mercado (SOM) com a verba real de editais municipais.",
  gaps: [
    "Não há evidência do ciclo de compra B2G municipal < 12 meses.",
    "Falta validar disposição a pagar por aluno.",
  ],
  pillars: [
    { type: "setup", status: "concluida", score: 90 },
    { type: "ambiente", status: "pronta_para_gate", score: 72 },
    { type: "estrategia", status: "em_dialogo", score: 58 },
    { type: "interacoes", status: "em_pesquisa", score: null },
    { type: "operacoes", status: "nao_iniciada", score: null },
    { type: "unificacao", status: "nao_iniciada", score: null },
    { type: "sintese", status: "nao_iniciada", score: null },
  ],
};

export interface MockPillarWorkspace {
  motherQuestion: string;
  subQuestions: string[];
  synthesis: string;
  sources: MockSource[];
  provocation: MockProvocation;
  gate: {
    evidenceSummary: string;
    gaps: string[];
    acceptableRisk: string;
    recommendedLogic: DecisionLogic;
  };
}

export interface MockThesisSection {
  pillar: PillarType;
  claim: string;
  confidence: ConfidenceLevel;
  score: number | null;
}

export const MOCK_THESIS: MockThesisSection[] = [
  { pillar: "ambiente", claim: "Mercado B2G de alfabetização existe e é pressionado por resultado do SAEB; SOM real depende de 2–3 redes âncora.", confidence: "media", score: 72 },
  { pillar: "estrategia", claim: "Aposta: conteúdo de alfabetização baseado em evidência + analytics para o gestor. Diferencial vs. apostilas genéricas.", confidence: "fraca", score: 58 },
  { pillar: "interacoes", claim: "Hipótese de dor confirmada com 4 entrevistas; disposição a pagar ainda não validada.", confidence: "fraca", score: null },
];

export interface MockThesisVersion {
  label: string;
  date: string;
  summary: string;
  changes: { type: "add" | "change" | "remove"; text: string; evidence?: string }[];
}

export const MOCK_VERSIONS: MockThesisVersion[] = [
  {
    label: "v0.3",
    date: "2026-06-22",
    summary: "Revisão do sizing após dados do FNDE; aposta estratégica refinada.",
    changes: [
      { type: "change", text: "SOM ano 1 reduzido de 'nacional' para '2–3 redes âncora'.", evidence: "FNDE — execução FUNDEB" },
      { type: "add", text: "Hipótese: analytics para o gestor é o que diferencia de apostila.", evidence: "Entrevista #3 (secretária de educação)" },
    ],
  },
  {
    label: "v0.2",
    date: "2026-06-15",
    summary: "Primeiras entrevistas incorporadas; dor confirmada.",
    changes: [
      { type: "add", text: "Dor de alfabetização confirmada em 4 entrevistas.", evidence: "Entrevistas #1–4" },
      { type: "remove", text: "Removida suposição de venda direta a escolas (canal é a secretaria).", evidence: "Entrevista #2" },
    ],
  },
  { label: "v0.1", date: "2026-06-08", summary: "Tese inicial a partir do briefing.", changes: [] },
];

export const MOCK_WORKSPACE: Record<string, MockPillarWorkspace> = {
  ambiente: {
    motherQuestion: "Existe um mercado real e acessível para alfabetização baseada em evidência no setor público?",
    subQuestions: [
      "Qual o tamanho do orçamento municipal endereçável (SAM/SOM)?",
      "Que cenários competitivos e regulatórios moldam a entrada?",
      "Quais são os 3 fatores competitivos decisivos?",
    ],
    synthesis:
      "O mercado de EdTech B2G no Brasil é fragmentado por município, com compra fortemente atrelada a editais e ao FUNDEB. Há espaço em alfabetização porque os resultados do SAEB pressionam gestores, mas o ciclo de compra é longo e político. O SOM realista no ano 1 depende de 2–3 redes municipais âncora.",
    sources: [
      { title: "INEP — resultados SAEB 2024 (alfabetização)", origin: "inep.gov.br", confidence: "forte" },
      { title: "FNDE — execução FUNDEB por município", origin: "fnde.gov.br", confidence: "media" },
      { title: "Estimativa de TAM por análogo (3 EdTechs B2G)", origin: "análise interna", confidence: "fraca" },
    ],
    provocation: {
      kind: "desmonta suposições",
      text: "Seu SOM assume que verba de FUNDEB cobre software, mas grande parte é carimbada para pessoal. Você checou a fração efetivamente disponível para tecnologia?",
    },
    gate: {
      evidenceSummary: "Mercado existe e é pressionado por resultado; tamanho real depende de poucas redes âncora.",
      gaps: ["Fração de verba para tecnologia não confirmada", "Ciclo de compra municipal não medido"],
      acceptableRisk: "Entrar com 2 redes-piloto antes de cravar o sizing nacional.",
      recommendedLogic: "apostar",
    },
  },
};
