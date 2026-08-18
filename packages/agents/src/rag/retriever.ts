/** Recuperação por similaridade sobre pgvector (PRD §7 / ADR 0001 §3.8). */

export interface RetrievedChunk {
  content: string;
  source_type: string;
  source_ref: string | null;
  dist?: number;
}

/** Executor de SQL agnóstico de driver (node-postgres em prod, PGlite em teste). */
export type SqlExec = (sql: string, params: unknown[]) => Promise<{ rows: RetrievedChunk[] }>;

export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

export interface Retriever {
  retrieve(queryEmbedding: number[], k: number, projectId?: string | null): Promise<RetrievedChunk[]>;
}

/**
 * Busca os k chunks mais próximos (distância cosine `<=>`). Inclui o corpus
 * global (project_id IS NULL) e o do projeto informado.
 */
export function pgvectorRetriever(exec: SqlExec): Retriever {
  return {
    async retrieve(queryEmbedding, k, projectId = null) {
      const vec = toVectorLiteral(queryEmbedding);
      const sql = `
        SELECT content, source_type, source_ref, (embedding <=> $1::vector) AS dist
        FROM rag_chunks
        WHERE ($2::uuid IS NULL OR project_id = $2::uuid OR project_id IS NULL)
        ORDER BY embedding <=> $1::vector
        LIMIT $3`;
      const { rows } = await exec(sql, [vec, projectId, k]);
      return rows;
    },
  };
}
