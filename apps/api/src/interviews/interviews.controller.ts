import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { SessionGuard } from "../auth/session.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { type CreateInterviewInput, InterviewsService } from "./interviews.service";

const createInterviewBody = z.object({
  contactName: z.string().optional(),
  persona: z.string().optional(),
  transcript: z.string().min(1, "transcrição é obrigatória"),
  consent: z.boolean(),
});

@Controller("projects/:id/interviews")
@UseGuards(SessionGuard)
export class InterviewsController {
  constructor(@Inject(InterviewsService) private readonly interviews: InterviewsService) {}

  @Get()
  list(@Param("id") id: string) {
    return this.interviews.list(id);
  }

  @Post()
  create(@Param("id") id: string, @Body(new ZodValidationPipe(createInterviewBody)) body: CreateInterviewInput) {
    return this.interviews.create(id, body);
  }
}
