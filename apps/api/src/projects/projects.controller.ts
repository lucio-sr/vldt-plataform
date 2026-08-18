import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { type CreateProject, createProjectSchema } from "@labvie/domain";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { CurrentUser, type SessionUser } from "../auth/current-user.decorator";
import { SessionGuard } from "../auth/session.guard";
import { ProjectsService } from "./projects.service";

@Controller("projects")
@UseGuards(SessionGuard)
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projects: ProjectsService) {}

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.projects.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createProjectSchema)) body: CreateProject,
  ) {
    return this.projects.create(user.id, body);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.projects.getWithPillars(id);
  }
}
