import { Module } from "@nestjs/common";
import { SessionGuard } from "../auth/session.guard";
import { InterviewsController } from "./interviews.controller";
import { InterviewsService } from "./interviews.service";

@Module({
  controllers: [InterviewsController],
  providers: [InterviewsService, SessionGuard],
})
export class InterviewsModule {}
