import { Logger } from "@nestjs/common";
import IORedis from "ioredis";

const logger = new Logger("Redis");

/** Conexão IORedis para BullMQ. maxRetriesPerRequest:null é exigido por Workers. */
export function createRedisConnection(): IORedis {
  const conn = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    lazyConnect: true, // só conecta quando há job (evita ruído no boot sem Redis)
  });
  conn.on("error", (e: Error) => logger.warn(`conexão Redis indisponível: ${e.message}`));
  return conn;
}
