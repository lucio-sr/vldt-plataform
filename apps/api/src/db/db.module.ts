import { Global, Module } from "@nestjs/common";
import pg from "pg";
import { DRIZZLE, createDb } from "./client";

/** Token do pool pg cru (para SQL parametrizado em persistência/leituras). */
export const PG_POOL = Symbol("PG_POOL");

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: () => {
        const url = process.env.DATABASE_URL;
        if (!url) throw new Error("DATABASE_URL não definida (veja .env.example)");
        return createDb(url);
      },
    },
    {
      provide: PG_POOL,
      useFactory: () => {
        const url = process.env.DATABASE_URL;
        if (!url) throw new Error("DATABASE_URL não definida (veja .env.example)");
        return new pg.Pool({ connectionString: url });
      },
    },
  ],
  exports: [DRIZZLE, PG_POOL],
})
export class DbModule {}
