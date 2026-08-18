import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn, signUp } from "../lib/auth-client";
import { Button, Card } from "../ui/primitives";

export function SignInPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r =
        mode === "in"
          ? await signIn.email({ email, password })
          : await signUp.email({ name, email, password });
      if (r.error) throw new Error(r.error.message ?? "falha na autenticação");
      nav("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "falha na autenticação");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-1 text-3xl">Labvie</h1>
      <p className="mb-6 text-[var(--color-ink-soft)]">Copesquisador estratégico.</p>
      <Card className="p-6">
        <div className="mb-4 flex gap-1 rounded-lg border border-[var(--color-line)] p-1">
          {(["in", "up"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm ${
                mode === m ? "bg-[var(--color-ink)] text-white" : "text-[var(--color-ink-soft)]"
              }`}
            >
              {m === "in" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "up" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="rounded-md border border-[var(--color-line)] px-3 py-2"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            className="rounded-md border border-[var(--color-line)] px-3 py-2"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="senha"
            className="rounded-md border border-[var(--color-line)] px-3 py-2"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "…" : mode === "in" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
