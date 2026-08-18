import { Link, useParams } from "react-router-dom";
import { getCurrentThesis } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { PILLAR_META } from "../lib/aeiou";
import { Card, ConfidenceSeal } from "../ui/primitives";

/** T6 — Tese consolidada (PRD §11.2): a síntese mais recente de cada etapa, com confiança. */
export function TesePage() {
  const { id = "" } = useParams();
  const { data, loading, error } = useAsync(() => getCurrentThesis(id), [id]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link to={`/projects/${id}`} className="text-sm text-[var(--color-ink-soft)] hover:underline">
        ← Dashboard
      </Link>
      <header className="mb-6 mt-3 flex items-end justify-between">
        <div>
          <h1 className="text-3xl">A tese</h1>
          <p className="mt-1 text-[var(--color-ink-soft)]">Entregável vivo, rastreável e versionado.</p>
        </div>
        <Link to={`/projects/${id}/historico`} className="text-sm text-[var(--color-esmeralda)] hover:underline">
          Histórico &amp; diff →
        </Link>
      </header>

      {loading && <p className="text-[var(--color-ink-soft)]">Carregando…</p>}
      {error && <p className="text-sm text-red-700">Erro: {error}</p>}
      {data && data.length === 0 && (
        <Card className="p-8 text-center text-[var(--color-ink-soft)]">
          A tese ainda está vazia. Rode a pesquisa de uma etapa e avance no gate para começar a versioná-la.
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {data?.map((sec) => {
          const meta = PILLAR_META[sec.pillar];
          return (
            <Card key={sec.pillar} className="p-5">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-display text-sm text-[var(--color-esmeralda)]">
                  {meta?.letter} · {meta?.founder}
                </span>
                <div className="flex items-center gap-2">
                  {sec.score != null && <span className="text-xs text-[var(--color-ink-soft)]">{sec.score}/100</span>}
                  {sec.confidence && <ConfidenceSeal level={sec.confidence} />}
                </div>
              </div>
              <p className="leading-relaxed">{sec.claim}</p>
            </Card>
          );
        })}
      </div>

      {data && data.length > 0 && (
        <div className="mt-6 flex gap-2">
          <button className="rounded-md bg-[var(--color-esmeralda)] px-4 py-2 text-sm font-medium text-white">
            Exportar PDF
          </button>
          <button className="rounded-md border border-[var(--color-line)] px-4 py-2 text-sm">
            Compartilhar (somente leitura)
          </button>
        </div>
      )}
    </main>
  );
}
