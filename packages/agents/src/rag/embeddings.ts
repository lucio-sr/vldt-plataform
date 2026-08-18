/** Embeddings para o RAG (pgvector). Mock determinístico + OpenAI real. */
export interface Embedder {
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
}

/** Pseudo-embedding determinístico (sem rede) — para testes. */
export class MockEmbedder implements Embedder {
  readonly dimensions: number;
  constructor(dimensions = 1536) {
    this.dimensions = dimensions;
  }
  async embed(text: string): Promise<number[]> {
    const v = new Array<number>(this.dimensions).fill(0);
    for (let i = 0; i < text.length; i++) {
      const idx = i % this.dimensions;
      v[idx] = (v[idx] ?? 0) + text.charCodeAt(i);
    }
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / norm);
  }
}

export class OpenAIEmbedder implements Embedder {
  readonly dimensions = 1536;
  constructor(
    private readonly apiKey: string = process.env.OPENAI_API_KEY ?? "",
    private readonly model: string = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
  ) {}
  async embed(text: string): Promise<number[]> {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: this.model, input: text }),
    });
    if (!res.ok) throw new Error(`OpenAI embeddings ${res.status}: ${await res.text()}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    return data.data[0].embedding as number[];
  }
}
