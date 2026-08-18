import type {
  ConfidenceLevel,
  CreateProject,
  DecisionLogic,
  GateDecisionType,
  PillarStatus,
  PillarType,
  ProjectMode,
  ProjectStatus,
} from "@labvie/domain";

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "content-type": "application/json" },
    credentials: "include", // cookie de sessão do Better Auth
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

// ---------- tipos de resposta ----------
export interface ProjectRow {
  id: string;
  name: string;
  oneLiner: string | null;
  stage: string | null;
  mode: ProjectMode;
  status: ProjectStatus;
  currentPillarId: string | null;
}

export interface PillarRow {
  id: string;
  type: PillarType;
  status: PillarStatus;
  score: number | null;
  logic: DecisionLogic | null;
  position: number;
}

export interface ThesisVersionRow {
  version_label: string;
  summary: string | null;
  diff: { changes: { type: string; pillar: string; claim: string }[] } | null;
  created_at: string;
}

export interface ThesisSection {
  pillar: PillarType;
  score: number | null;
  claim: string | null;
  confidence: ConfidenceLevel | null;
}

export interface SynthesisContent {
  research: { synthesis: string; sources: { title: string; origin: string; confidence: ConfidenceLevel }[]; gaps: string[] };
  adversarial: { provocations: { kind: string; text: string }[] };
  synthesis: { claim: string; confidence: ConfidenceLevel; score: number; recommendedLogic: DecisionLogic; gaps: string[] };
}

export interface PillarWorkspace {
  pillar: { id: string; status: PillarStatus; score: number | null; logic: DecisionLogic | null };
  questions: { text: string; is_mother: boolean; status: string }[];
  evidences: { title: string; source_origin: string | null; confidence: ConfidenceLevel }[];
  synthesis: SynthesisContent | null;
}

// ---------- chamadas ----------
export const listProjects = () => http<ProjectRow[]>("/projects");

export const createProject = (input: CreateProject) =>
  http<ProjectRow>("/projects", { method: "POST", body: JSON.stringify(input) });

export const getProjectDetail = (id: string) =>
  http<{ project: ProjectRow; pillars: PillarRow[] }>(`/projects/${id}`);

export const getThesisVersions = (id: string) => http<ThesisVersionRow[]>(`/projects/${id}/thesis`);

export const getCurrentThesis = (id: string) => http<ThesisSection[]>(`/projects/${id}/thesis/current`);

export const getPillarWorkspace = (id: string, type: string) =>
  http<PillarWorkspace>(`/projects/${id}/pillars/${type}`);

export const runPillar = (id: string, type: string, motherQuestion?: string) =>
  http<{ enqueued: boolean; jobId: string }>(`/projects/${id}/pillars/${type}/run`, {
    method: "POST",
    body: JSON.stringify({ motherQuestion }),
  });

export const gatePillar = (
  id: string,
  type: string,
  body: { decision: GateDecisionType; justification: string; logic?: DecisionLogic | null },
) =>
  http<{ pillarStatus: PillarStatus; thesisVersion?: string }>(`/projects/${id}/pillars/${type}/gate`, {
    method: "POST",
    body: JSON.stringify(body),
  });
