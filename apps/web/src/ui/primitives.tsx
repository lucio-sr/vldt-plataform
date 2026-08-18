import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { ConfidenceLevel, DecisionLogic } from "@labvie/domain";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] ${className}`}>
      {children}
    </div>
  );
}

type Variant = "primary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-[var(--color-esmeralda)] text-white hover:opacity-90",
  ghost: "border border-[var(--color-line)] text-[var(--color-ink)] hover:bg-black/[0.03]",
  danger: "border border-red-300 text-red-700 hover:bg-red-50",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium transition ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Selo de evidência/confiança (PRD §12). */
export function ConfidenceSeal({ level }: { level: ConfidenceLevel }) {
  const map: Record<ConfidenceLevel, string> = {
    forte: "bg-emerald-100 text-emerald-800",
    media: "bg-amber-100 text-amber-800",
    fraca: "bg-orange-100 text-orange-800",
    lacuna: "bg-red-100 text-red-800",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${map[level]}`}>{level}</span>
  );
}

/** Indicador de lógica: azul=planejar, âmbar=apostar (PRD Apêndice A). */
export function LogicBadge({ logic }: { logic: DecisionLogic }) {
  const isPlan = logic === "planejar";
  return (
    <span
      className="rounded-md px-2 py-0.5 text-xs font-medium text-white"
      style={{ background: isPlan ? "var(--color-planejar)" : "var(--color-apostar)" }}
    >
      {isPlan ? "Planejar" : "Apostar"}
    </span>
  );
}
