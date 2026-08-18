import { type ReactNode, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { DecisionLogic, GateDecisionType } from "@labvie/domain";
import { gatePillar, getPillarWorkspace, runPillar } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { PILLAR_META, STATUS_LABEL } from "../lib/aeiou";
import { Button, Card, ConfidenceSeal, LogicBadge } from "../ui/primitives";

/** T4 — Workspace da etapa (PRD §10.2): síntese com fontes, provocações, bloco de gate. */
export function PillarWorkspacePage() {
  const { id = "", type = "ambiente" } = useParams();
  const meta = PILLAR_META[type as keyof typeof PILLAR_META] ?? PILLAR_META.ambiente;
  const { data, loading, error, reload } = useAsync(() => getPillarWorkspace(id, type), [id, type]);
  const [justification, setJustification] = useState("");
  const [logic, setLogic] = useState<DecisionLogic>("apostar");
  const [msg, setMsg] = useState<string | null>(null);

  async function onRun() {
    await runPillar(id, type);
    setMsg("Pesquisa enfileirada — atualize em instantes.");
    setTimeout(reload, 1500);
  }

  async function onGate(decision: GateDecisionType) {
    if (decision === "avancar" && !justification.trim()) {
      setMsg("Avançar exige uma justificativa.");
      return;
    }
    const r = await gatePillar(id, type, { decision, justification: justification.trim() || "—", logic });
    setMsg(r.thesisVersion ? `Etapa ${r.pillarStatus}. Tese commitada: ${r.thesisVersion}.` : `Etapa ${r.pillarStatus}.`);
    reload();
  }

  if (loading) return <Centered>Carregando etapa…</Centered>;
  if (error) return <Centered>Erro: {error}</Centered>;
  if (!data) return null;

  const mother = data.questions.find((q) => q.is_mother);
  const syn = data.synthesis;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link to={`/projects/${id}`} className="text-sm text-[var(--color-ink-soft)] hover:underline">
        ← Dashboard
      </Link>
      <header className="mb-5 mt-3">
        <p className="font-display text-sm text-[var(--color-esmeralda)]">
          Etapa {meta.letter} · {meta.founder} · {STATUS_LABEL[data.pillar.status]}
        </p>
        <h1 className="mt-1 text-2xl leading-snug">{mother?.text ?? meta.benefit}</h1>
      </header>

      {msg && <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}

      {!syn ? (
        <Card className="p-8 text-center">
          <p className="text-[var(--color-ink-soft)]">Esta etapa ainda não foi pesquisada.</p>
          <Button className="mt-4" onClick={onRun}>
            Rodar pesquisa
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="p-6">
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
              Síntese com fontes
            </h2>
            <p className="leading-relaxed">{syn.research.synthesis}</p>
            <ul className="mt-4 flex flex-col gap-2">
              {data.evidences.map((e, i) => (
                <li key={i} className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] pt-2 text-sm">
                  <span>
                    {e.title} {e.source_origin && <span className="text-[var(--color-ink-soft)]">· {e.source_origin}</span>}
                  </span>
                  <ConfidenceSeal level={e.confidence} />
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-l-4 border-l-[var(--color-apostar)] p-6">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-apostar)]">
              Provocações
            </span>
            <ul className="mt-2 flex flex-col gap-3">
              {syn.adversarial.provocations.map((p, i) => (
                <li key={i}>
                  <span className="text-xs text-[var(--color-ink-soft)]">{p.kind}</span>
                  <p className="leading-snug">{p.text}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
              Bloco de gate
            </h2>
            <p className="text-sm"><strong>Tese da etapa:</strong> {syn.synthesis.claim}</p>
            <p className="mt-1 text-sm">
              Score {syn.synthesis.score}/100 · recomendado:{" "}
              <span className="font-medium">{syn.synthesis.recommendedLogic}</span>
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-sm text-[var(--color-ink-soft)]">Lógica:</span>
              <button onClick={() => setLogic("planejar")}>
                <span className={logic === "planejar" ? "" : "opacity-40"}><LogicBadge logic="planejar" /></span>
              </button>
              <button onClick={() => setLogic("apostar")}>
                <span className={logic === "apostar" ? "" : "opacity-40"}><LogicBadge logic="apostar" /></span>
              </button>
            </div>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Justificativa da decisão (obrigatória para avançar)…"
              rows={2}
              className="mt-3 w-full rounded-md border border-[var(--color-line)] p-3 text-sm outline-none focus:border-[var(--color-esmeralda)]"
            />
            <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-line)] pt-3">
              <Button onClick={() => onGate("avancar")}>Avançar → commitar</Button>
              <Button variant="ghost" onClick={() => onGate("voltar_pesquisar")}>Voltar a pesquisar</Button>
              <Button variant="danger" onClick={() => onGate("arquivar")}>Arquivar</Button>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-3xl px-6 py-20 text-center text-[var(--color-ink-soft)]">{children}</main>;
}
