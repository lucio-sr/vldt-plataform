import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { decisionLogic, gateDecisionType } from "@labvie/domain";
import { z } from "zod";
import { CurrentUser, type SessionUser } from "../auth/current-user.decorator";
import { SessionGuard } from "../auth/session.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ResearchProducer } from "../queue/research.producer";
import { PillarsService } from "./pillars.service";

const gateBody = z.object({
  decision: gateDecisionType,
  justification: z.string().min(1, "gate exige justificativa"),
  logic: decisionLogic.nullish(),
});
type GateBody = z.infer<typeof gateBody>;

@Controller("projects/:id")
@UseGuards(SessionGuard)
export class PillarsController {
  constructor(
    @Inject(PillarsService) private readonly pillars: PillarsService,
    @Inject(ResearchProducer) private readonly producer: ResearchProducer,
  ) {}

  @Get("thesis")
  thesis(@Param("id") id: string) {
    return this.pillars.getThesis(id);
  }

  @Get("thesis/current")
  currentThesis(@Param("id") id: string) {
    return this.pillars.getCurrentThesis(id);
  }

  @Get("pillars/:type")
  workspace(@Param("id") id: string, @Param("type") type: string) {
    return this.pillars.getWorkspace(id, type);
  }

  /** Dispara o loop de pesquisa da etapa (assíncrono, via fila). */
  @Post("pillars/:type/run")
  async run(@Param("id") id: string, @Param("type") type: string, @Body() body: { motherQuestion?: string }) {
    const motherQuestion = body?.motherQuestion ?? this.pillars.defaultQuestion(type);
    const job = await this.producer.enqueuePillarResearch({ projectId: id, pillarType: type, motherQuestion });
    return { enqueued: true, jobId: job.id };
  }

  /** Decisão de gate — o humano decide (PRD §5.4); em "avançar" commita versão da tese. */
  @Post("pillars/:type/gate")
  gate(
    @Param("id") id: string,
    @Param("type") type: string,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(gateBody)) body: GateBody,
  ) {
    return this.pillars.gate(id, type, {
      decision: body.decision,
      justification: body.justification,
      authorId: user.id,
      logic: body.logic ?? null,
    });
  }
}
