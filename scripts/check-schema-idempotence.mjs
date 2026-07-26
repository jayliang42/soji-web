import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = readFileSync(path.join(root, "supabase/config.toml"), "utf8");
const projectId = config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];

if (!projectId) {
  console.error("Unable to read project_id from supabase/config.toml.");
  process.exit(1);
}

const schema = readFileSync(path.join(root, "supabase/schema.sql"), "utf8");
let guardedEnumCount = 0;
const schemaForReapply = schema.replace(
  /^create type [a-z_][a-z0-9_]* as enum\s*\([\s\S]*?\);/gim,
  (statement) => {
    guardedEnumCount += 1;
    const indented = statement
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n");
    return `do $$ begin\n${indented}\nexception when duplicate_object then null;\nend $$;`;
  }
);
const container = `supabase_db_${projectId}`;
const result = spawnSync(
  "docker",
  [
    "exec",
    "-i",
    container,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    "-"
  ],
  {
    cwd: root,
    encoding: "utf8",
    input: schemaForReapply,
    maxBuffer: 16 * 1024 * 1024
  }
);

if (result.error) {
  console.error(`Unable to execute schema through ${container}: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const enumNote =
  guardedEnumCount > 0
    ? ` (${guardedEnumCount} top-level enum definitions guarded)`
    : "";
console.log(
  `schema.sql reapplied successfully through ${container}${enumNote}.`
);
