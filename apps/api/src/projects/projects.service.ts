import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateProject } from "@labvie/domain";
import { eq } from "drizzle-orm";
import { DRIZZLE, type Database } from "../db/client";
import { pillars, projects } from "../db/schema";

/** Sequência de etapas criadas no Setup de um projeto (PRD §6.1 / Apêndice B). */
const PILLAR_SEQUENCE = [
  "setup",
  "ambiente",
  "estrategia",
  "interacoes",
  "operacoes",
  "unificacao",
  "sintese",
] as const;

@Injectable()
export class ProjectsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  list(ownerId: string) {
    return this.db.select().from(projects).where(eq(projects.ownerId, ownerId));
  }

  async create(ownerId: string, input: CreateProject) {
    const inserted = await this.db
      .insert(projects)
      .values({
        name: input.name,
        oneLiner: input.oneLiner ?? null,
        stage: input.stage ?? null,
        mode: input.mode,
        ownerId,
      })
      .returning();

    const project = inserted[0];
    if (!project) throw new Error("falha ao criar projeto");

    // Materializa as 7 etapas (Setup + AEIOU + Síntese) já no estado inicial.
    await this.db.insert(pillars).values(
      PILLAR_SEQUENCE.map((type, position) => ({
        projectId: project.id,
        type,
        position,
      })),
    );

    return project;
  }

  async get(id: string) {
    const rows = await this.db.select().from(projects).where(eq(projects.id, id));
    const project = rows[0];
    if (!project) throw new NotFoundException("projeto não encontrado");
    return project;
  }

  /** Projeto + suas etapas (para o dashboard T3). */
  async getWithPillars(id: string) {
    const project = await this.get(id);
    const pillarRows = await this.db
      .select()
      .from(pillars)
      .where(eq(pillars.projectId, id))
      .orderBy(pillars.position);
    return { project, pillars: pillarRows };
  }
}
