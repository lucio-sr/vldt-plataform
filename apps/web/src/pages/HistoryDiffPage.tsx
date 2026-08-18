import { Link, useParams } from "react-router-dom";
import { getThesisVersions } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { Card } from "../ui/primitives";

const CHANGE_STYLE: Record<string, { sign: string; color: string }> = {
  add: { sign: "+", color: "text-emerald-700" },
  change: { sign: "~", color: "text-amber-700" },
  remove: { sign: "−", color: "text-red-700" },
};

/** T7 — Histórico / Diff (PRD §11.2): timeline de versões + diff legível. */
export function HistoryDiffPage() {
  const { id = "" } = useParams();
  const { data, loading, error } = useAsync(() => getThesisVersions(id), [id]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link to={`/projects/${id}/tese`} className="text-sm text-[var(--color-ink-soft)] hover:underline">
        ← A tese
      </Link>
      <header className="mb-6 mt-3">
        <h1 className="text-3xl">Histórico da tese</h1>
        <p className="mt-1 text-[var(--color-ink-soft)]">Cada versão é um snapshot. O diff mostra o que mudou.</p>
      </header>

      {loading && <p className="text-[var(--color-ink-soft)]">Carregando…</p>}
      {error && <p className="text-sm text-red-700">Erro: {error}</p>}
      {data && data.length === 0 && (
        <Card className="p-8 text-center text-[var(--color-ink-soft)]">
          Nenhuma versão ainda. A primeira nasce quando você avança no gate de uma etapa.
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {data?.map((v, i) => (
          <Card key={v.version_label} className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">{v.version_label}</h2>
              <span className="text-xs text-[var(--color-ink-soft)]">
                {new Date(v.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
            {v.summary && <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{v.summary}</p>}
            {v.diff && v.diff.changes.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2 border-t border-[var(--color-line)] pt-3">
                {v.diff.changes.map((c, j) => {
                  const st = CHANGE_STYLE[c.type] ?? CHANGE_STYLE.change!;
                  return (
                    <li key={j} className="text-sm">
                      <span className={`font-mono font-bold ${st.color}`}>{st.sign}</span>{" "}
                      <span className="text-[var(--color-ink-soft)]">[{c.pillar}]</span> {c.claim}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-xs text-[var(--color-ink-soft)]">
                Sem diff registrado.
              </p>
            )}
            {i === 0 && (
              <span className="mt-3 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                versão atual
              </span>
            )}
          </Card>
        ))}
      </div>
    </main>
  );
}
