import type { ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useSession } from "./lib/auth-client";
import { DashboardPage } from "./pages/DashboardPage";
import { HistoryDiffPage } from "./pages/HistoryDiffPage";
import { PillarWorkspacePage } from "./pages/PillarWorkspacePage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SignInPage } from "./pages/SignInPage";
import { TesePage } from "./pages/TesePage";

function RequireAuth({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  if (isPending) return <div className="p-10 text-[var(--color-ink-soft)]">Carregando…</div>;
  if (!session) return <SignInPage />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <RequireAuth>
        <Routes>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<DashboardPage />} />
          <Route path="/projects/:id/etapa/:type" element={<PillarWorkspacePage />} />
          <Route path="/projects/:id/tese" element={<TesePage />} />
          <Route path="/projects/:id/historico" element={<HistoryDiffPage />} />
        </Routes>
      </RequireAuth>
    </BrowserRouter>
  );
}
