import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { toNodeHandler } from "better-auth/node";
import { json, type RequestHandler } from "express";
import { AppModule } from "./app.module";
import { auth } from "./auth/auth";

async function bootstrap() {
  // bodyParser:false → o handler do Better Auth lê o corpo cru antes do json().
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? true, credentials: true });

  // Better Auth montado ANTES do parser (Express 5: wildcard nomeado *splat).
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.all("/api/auth/*splat", toNodeHandler(auth) as unknown as RequestHandler);
  app.use(json());

  const port = process.env.API_PORT ? Number(process.env.API_PORT) : 3001;
  await app.listen(port);
  console.log(`Labvie API ouvindo em http://localhost:${port}`);
}

void bootstrap();
