import { Body, Controller, Inject, Post } from "@nestjs/common";
import { ResearchProducer } from "../queue/research.producer";

/** Endpoints de enfileiramento (Fase A: ping; Fase C: pesquisa de etapa). */
@Controller("jobs")
export class JobsController {
  constructor(@Inject(ResearchProducer) private readonly producer: ResearchProducer) {}

  @Post("ping")
  async ping(@Body() body: { message?: string }) {
    const job = await this.producer.enqueuePing(body?.message ?? "ping");
    return { enqueued: true, jobId: job.id };
  }

  @Post("pillar-research")
  async pillarResearch(
    @Body() body: { projectId: string; pillarType: string; motherQuestion: string },
  ) {
    const job = await this.producer.enqueuePillarResearch(body);
    return { enqueued: true, jobId: job.id };
  }
}
