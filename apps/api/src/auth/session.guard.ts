import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";
import { auth } from "./auth";
import type { SessionUser } from "./current-user.decorator";

/** Valida a sessão do Better Auth e injeta o usuário na request. */
@Injectable()
export class SessionGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user?: SessionUser; session?: unknown }>();

    const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!result) throw new UnauthorizedException("não autenticado");

    req.user = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    };
    req.session = result.session;
    return true;
  }
}
