import {
  type LlmGenerateOptions,
  type LlmMessage,
  type LlmProvider,
  type LlmResult,
  computeCostUsd,
  estimateTokens,
} from "./provider.js";

export type MockResponder = (messages: LlmMessage[], opts: LlmGenerateOptions) => string;

/** Provider determinístico para testes — sem chamadas de rede nem API keys. */
export class MockProvider implements LlmProvider {
  readonly name = "mock";
  constructor(private readonly responder: MockResponder = defaultResponder) {}

  async generate(messages: LlmMessage[], opts: LlmGenerateOptions = {}): Promise<LlmResult> {
    const text = this.responder(messages, opts);
    const model = opts.model ?? "mock";
    const inputTokens = estimateTokens(messages.map((m) => m.content).join("\n"));
    const outputTokens = estimateTokens(text);
    return {
      text,
      usage: { model, inputTokens, outputTokens, costUsd: computeCostUsd(model, inputTokens, outputTokens) },
    };
  }
}

function lastUser(messages: LlmMessage[]): string {
  return [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
}

const defaultResponder: MockResponder = (messages, opts) => {
  const tag = opts.tag ?? "";
  const user = lastUser(messages);

  if (tag === "background_research") {
    const n = Number(user.match(/CONTEXT_ITEMS=(\d+)/)?.[1] ?? 0);
    const sources = Array.from({ length: n }, (_, i) => ({
      title: `Fonte ${i + 1}`,
      origin: "corpus",
      confidence: i === 0 ? "forte" : "media",
    }));
    return JSON.stringify({
      synthesis: `Síntese baseada em ${n} fontes do corpus.`,
      sources,
      gaps: n ? ["validar disposição a pagar"] : ["sem evidência: corpus vazio"],
    });
  }

  if (tag === "adversarial") {
    return JSON.stringify({
      provocations: [
        { kind: "desmonta suposições", text: "A síntese assume verba disponível; checou a fração efetiva?" },
        { kind: "olha pra frente", text: "Se falhar em 18 meses, o que quebra primeiro?" },
      ],
    });
  }

  if (tag === "competitive_intelligence") {
    return JSON.stringify({
      competitors: [
        { name: "Concorrente A", recent_moves: ["lançou plano municipal", "contratou time comercial"], pricing: "por aluno/ano", narrative: "foco no gestor" },
      ],
      implications: ["preço por aluno pressiona margem", "narrativa precisa falar com a secretaria"],
    });
  }

  if (tag === "quant_analysis") {
    return JSON.stringify({
      sizing: { tam: "R$ 2bi", sam: "R$ 300mi", som: "R$ 12mi", assumptions: ["fração de FUNDEB para tecnologia"] },
      unit_economics: ["CAC alto via edital", "LTV depende de renovação anual"],
      sensitivity: ["sensível ao ciclo de compra municipal"],
    });
  }

  if (tag === "user_research") {
    return JSON.stringify({
      voice_of_customer: ["gestor quer prova de resultado antes de comprar"],
      objections: ["verba carimbada para pessoal", "medo de mais uma ferramenta parada"],
      patterns: ["decisão é política, não técnica"],
      evidences: [
        { title: "Dor de alfabetização confirmada", excerpt: "as crianças chegam ao 5º ano sem ler", confidence: "media" },
      ],
    });
  }

  if (tag === "sintetizador") {
    return JSON.stringify({
      claim: "Há espaço, mas o sizing depende de poucas redes âncora.",
      confidence: "media",
      score: 68,
      recommendedLogic: "apostar",
      gaps: ["ciclo de compra não medido"],
    });
  }

  return JSON.stringify({ ok: true });
};
