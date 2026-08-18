import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import pg from "pg";
import { PG_POOL } from "../db/db.module";
import type { QueryFn } from "../pillars/persistence";
import { ResearchProducer } from "../queue/research.producer";

export interface CreateInterviewInput {
  contactName?: string;
  persona?: string;
  transcript: string;
  consent: boolean;
}

@Injectable()
export class InterviewsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: pg.Pool,
    @Inject(ResearchProducer) private readonly producer: ResearchProducer,
  ) {}

  private get q(): QueryFn {
    return (sql, params) => this.pool.query(sql, params);
  }

  async create(projectId: string, body: CreateInterviewInput) {
    if (!body.consent) throw new BadRequestException("consentimento (LGPD) é obrigatório para análise");
    if (!body.transcript?.trim()) throw new BadRequestException("transcrição é obrigatória");

    const row = (
      await this.q(
        `INSERT INTO interviews (project_id, contact_name, persona, transcript, consent, status)
         VALUES ($1, $2, $3, $4, true, 'processando') RETURNING id`,
        [projectId, body.contactName ?? null, body.persona ?? null, body.transcript],
      )
    ).rows[0];
    if (!row) throw new BadRequestException("falha ao criar entrevista");

    await this.producer.enqueueInterviewAnalysis({ projectId, interviewId: row.id as string });
    return { id: row.id as string, status: "processando" };
  }

  async list(projectId: string) {
    const { rows } = await this.q(
      `SELECT id, contact_name, persona, status, created_at FROM interviews WHERE project_id = $1 ORDER BY created_at DESC`,
      [projectId],
    );
    return rows;
  }
}
