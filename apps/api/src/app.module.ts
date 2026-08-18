import { Module } from "@nestjs/common";
import { DbModule } from "./db/db.module";
import { HealthController } from "./health/health.controller";
import { InterviewsModule } from "./interviews/interviews.module";
import { JobsController } from "./jobs/jobs.controller";
import { PillarsModule } from "./pillars/pillars.module";
import { ProjectsModule } from "./projects/projects.module";
import { QueueModule } from "./queue/queue.module";

@Module({
  imports: [DbModule, QueueModule, ProjectsModule, PillarsModule, InterviewsModule],
  controllers: [HealthController, JobsController],
})
export class AppModule {}
