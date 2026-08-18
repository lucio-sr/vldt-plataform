import {
  Global,
  Logger,
  Module,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { type Job, Queue, Worker } from "bullmq";
import { processInterviewAnalysis, processPillarResearch } from "./agents-runner";
import { createRedisConnection } from "./redis.connection";
import { RESEARCH_QUEUE, RESEARCH_QUEUE_NAME, type ResearchJob } from "./queue.tokens";
import { ResearchProducer } from "./research.producer";

@Global()
@Module({
  providers: [
    {
      provide: RESEARCH_QUEUE,
      useFactory: () =>
        new Queue<ResearchJob>(RESEARCH_QUEUE_NAME, { connection: createRedisConnection() }),
    },
    ResearchProducer,
  ],
  exports: [RESEARCH_QUEUE, ResearchProducer],
})
export class QueueModule implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<ResearchJob>;
  private readonly logger = new Logger("ResearchWorker");

  onModuleInit(): void {
    if (process.env.QUEUE_ENABLED === "false") {
      this.logger.log("worker desabilitado (QUEUE_ENABLED=false)");
      return;
    }
    this.worker = new Worker<ResearchJob>(
      RESEARCH_QUEUE_NAME,
      async (job: Job<ResearchJob>) => {
        if (job.data.kind === "pillar.research") {
          return processPillarResearch(job.data, this.logger);
        }
        if (job.data.kind === "interview.analyze") {
          return processInterviewAnalysis(job.data, this.logger);
        }
        this.logger.log(`ping ${job.id}: "${job.data.message}"`);
        return { ok: true, echoed: job.data.message };
      },
      { connection: createRedisConnection() },
    );
    this.worker.on("completed", (job) => this.logger.log(`job ${job.id} concluído`));
    this.worker.on("error", (e) => this.logger.warn(`worker: ${e.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
