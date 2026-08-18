// Gera JSON Schema (strict) a partir dos YAML de ontologia (ADR 0001 §3.1).
// Fonte da verdade = aeiou/ontology/*.yaml ; artefato de runtime = _generated/*.schema.json
// Uso: npm run gen:schemas
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ontDir = join(root, "aeiou", "ontology");
const outDir = join(ontDir, "_generated");
mkdirSync(outDir, { recursive: true });

const files = readdirSync(ontDir).filter((f) => f.endsWith(".yaml")).sort();
for (const f of files) {
  const doc = parse(readFileSync(join(ontDir, f), "utf8"));
  const properties = {};
  for (const e of doc.entities ?? []) {
    properties[e.id] = {
      type: "array",
      items: {
        type: "object",
        properties: Object.fromEntries((e.fields ?? []).map((field) => [field, {}])),
        required: e.fields ?? [],
        additionalProperties: false,
      },
    };
  }
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `aeiou/${doc.pillar}`,
    title: `${doc.pillar} (${doc.letter ?? ""})`,
    description: doc.description,
    type: "object",
    properties,
    required: (doc.entities ?? []).map((e) => e.id),
    additionalProperties: false,
    "x-artifacts_required": doc.artifacts_required ?? [],
    "x-completion_criteria": doc.completion_criteria ?? [],
    "x-gate_decisions": doc.gate_decisions ?? [],
  };
  writeFileSync(join(outDir, `${doc.pillar}.schema.json`), JSON.stringify(schema, null, 2));
  console.log(`✓ ${f} → _generated/${doc.pillar}.schema.json (${(doc.entities ?? []).length} entidades)`);
}
console.log(`\n${files.length} schemas gerados em aeiou/ontology/_generated/`);
