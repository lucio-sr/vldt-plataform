import { type ExecutionContext, createParamDecorator } from "@nestjs/common";
import type { Request } from "express";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

/** Injeta o usuário da sessão (preenchido pelo SessionGuard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: SessionUser }>();
    if (!req.user) throw new Error("CurrentUser usado sem SessionGuard");
    return req.user;
  },
);
