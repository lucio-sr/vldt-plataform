import { Module } from "@nestjs/common";
import { SessionGuard } from "../auth/session.guard";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, SessionGuard],
})
export class ProjectsModule {}
