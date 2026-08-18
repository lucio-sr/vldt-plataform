import { Module } from "@nestjs/common";
import { SessionGuard } from "../auth/session.guard";
import { PillarsController } from "./pillars.controller";
import { PillarsService } from "./pillars.service";

@Module({
  controllers: [PillarsController],
  providers: [PillarsService, SessionGuard],
})
export class PillarsModule {}
