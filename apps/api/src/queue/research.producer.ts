import { Inject, Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";
import { RESEARCH_QUEUE, type ResearchJob } from "./queue.tokens";

@Injectable()
export class ResearchProducer {
  constructor(@Inject(RESEARCH_QUEUE) private readonly queue: Queue<ResearchJob>) {}

  enqueuePing(message: string) {
    return this.queue.add("ping", { kind: "ping", message, at: new Date().toISOString() });
  }

  enqueuePillarResearch(input: { projectId: string; pillarType: string; motherQuestion: string }) {
    return this.queue.add("pillar.research", { kind: "pillar.research", ...input });
  }

  enqueueInterviewAnalysis(input: { projectId: string; interviewId: string }) {
    return this.queue.add("interview.analyze", { kind: "interview.analyze", ...input });
  }
}
