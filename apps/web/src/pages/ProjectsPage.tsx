import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ProjectMode } from "@labvie/domain";
import { type ProjectRow, createProject, listProjects } from "../lib/api";
import { signOut } from "../lib/auth-client";
import { Button, Card } from "../ui/primitives";

/** T1 — Lista de projetos (PRD §11.2). */
export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [mode, setMode] = useState<ProjectMode>("solo");

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setProjects(await listProjects());
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createProject({ name: name.trim(), oneLiner: oneLiner.trim() || undefined, mode });
      setName("");
      setOneLiner("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro ao criar");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl">Seus projetos</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
            Cada projeto é uma jornada de pesquisa até uma tese viva e versionada.
          </p>
        </div>
        <button onClick={() => signOut()} className="text-sm text-[var(--color-ink-soft)] hover:underline">
          Sair
        </button>
      </header>

      <Card className="mb-10 p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">Novo projeto</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do projeto"
            className="rounded-md border border-[var(--color-line)] px-3 py-2 outline-none focus:border-[var(--color-esmeralda)]"
          />
          <input
            value={oneLiner}
            onChange={(e) => setOneLiner(e.target.value)}
            placeholder="Uma frase sobre a ideia"
            className="rounded-md border border-[var(--color-line)] px-3 py-2 outline-none focus:border-[var(--color-esmeralda)]"
          />
          <div className="flex items-center gap-3">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ProjectMode)}
              className="rounded-md border border-[var(--color-line)] px-3 py-2"
            >
              <option value="solo">Solo (founder + IA)</option>
              <option value="assistido">Assistido (com consultor)</option>
            </select>
            <Button type="submit">Criar projeto</Button>
          </div>
        </form>
      </Card>

      {loading && <p className="text-[var(--color-ink-soft)]">Carregando…</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!loading && !error && projects.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--color-line)] p-8 text-center text-[var(--color-ink-soft)]">
          Nenhum projeto ainda. Crie o primeiro acima para começar a pesquisa.
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {projects.map((p) => (
          <li key={p.id}>
            <Link to={`/projects/${p.id}`} className="block rounded-xl border border-[var(--color-line)] bg-white p-4 hover:shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{p.name}</h3>
                <span className="text-xs uppercase tracking-wide text-[var(--color-ink-soft)]">{p.mode}</span>
              </div>
              {p.oneLiner && <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{p.oneLiner}</p>}
              <p className="mt-2 text-xs text-[var(--color-ink-soft)]">status: {p.status}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
