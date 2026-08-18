import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { getProjectDetail, runPillar } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { PILLAR_META, STATUS_LABEL } from "../lib/aeiou";
import { Button, Card } from "../ui/primitives";

/** T3 — Dashboard do projeto (PRD §11.2): mapa das etapas, versão da tese, ações. */
export function DashboardPage() {
  const { id = "" } = useParams();
  const { data, loading, error, reload } = useAsync(() => getProjectDetail(id), [id]);

  if (loading) return <Centered>Carregando projeto…</Centered>;
  if (error) return <Centered>Erro: {error}</Centered>;
  if (!data) return null;

  const { project: p, pillars } = data;
  const active = pillars.find((pi) => pi.status !== "nao_iniciada" && pi.status !== "concluida");

  async function onRun(type: string) {
    await runPillar(id, type);
    setTimeout(reload, 1200);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link to="/" className="text-sm text-[var(--color-ink-soft)] hover:underline">
        ← Seus projetos
      </Link>
      <header className="mb-6 mt-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl">{p.name}</h1>
          {p.oneLiner && <p className="mt-1 text-[var(--color-ink-soft)]">{p.oneLiner}</p>}
        </div>
        <Link
          to={`/projects/${id}/tese`}
          className="rounded-md bg-[var(--color-ink)] px-2 py-1 text-xs text-white hover:opacity-90"
        >
          ver tese →
        </Link>
      </header>

      {active && (
        <Card className="mb-8 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
            Próximo movimento
          </h2>
          <p className="mt-1 text-lg">
            {PILLAR_META[active.type].founder}: {STATUS_LABEL[active.status].toLowerCase()}.
          </p>
        </Card>
      )}

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">As etapas</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {pillars.map((pi) => {
          const meta = PILLAR_META[pi.type];
          const done = pi.status === "concluida";
          const isActive = pi.status !== "nao_iniciada" && !done;
          return (
            <Card key={pi.id} className={`p-4 ${isActive ? "ring-1 ring-[var(--color-esmeralda)]" : ""}`}>
              <div className="flex items-center gap-4">
                <Link
                  to={`/projects/${id}/etapa/${pi.type}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full font-display text-lg"
                  style={{
                    background: done ? "var(--color-esmeralda)" : "var(--color-paper)",
                    color: done ? "#fff" : "var(--color-ink)",
                    border: "1px solid var(--color-line)",
                  }}
                >
                  {meta.letter}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <Link to={`/projects/${id}/etapa/${pi.type}`} className="text-base hover:underline">
                      {meta.founder}
                    </Link>
                    {pi.score != null && (
                      <span className="text-xs text-[var(--color-ink-soft)]">{pi.score}/100</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-[var(--color-ink-soft)]">{STATUS_LABEL[pi.status]}</p>
                </div>
              </div>
              {pi.type !== "setup" && pi.type !== "sintese" && (
                <div className="mt-3">
                  <Button variant="ghost" className="text-xs" onClick={() => onRun(pi.type)}>
                    Rodar pesquisa
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </main>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-4xl px-6 py-20 text-center text-[var(--color-ink-soft)]">{children}</main>;
}
