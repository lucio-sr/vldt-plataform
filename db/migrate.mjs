// Runner de migrations simples: aplica db/migrations/*.sql em ordem,
// registrando o que já rodou numa tabela _migrations.
// Uso: DATABASE_URL=... node db/migrate.mjs
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "migrations");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida. Veja .env.example.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function main() {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const applied = new Set(
    (await client.query("SELECT name FROM _migrations")).rows.map((r) => r.name),
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`• ${file} — já aplicada, pulando`);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`▶ aplicando ${file} ...`);
    try {
      await client.query(sql); // o .sql já tem BEGIN/COMMIT
      await client.query("INSERT INTO _migrations(name) VALUES ($1)", [file]);
      console.log(`✓ ${file} aplicada`);
    } catch (err) {
      console.error(`✗ falha em ${file}:`, err.message);
      process.exit(1);
    }
  }
  console.log("Migrations concluídas.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => client.end());
