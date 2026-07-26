import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(
  root,
  "apps/web/src/lib/supabase/database.types.ts"
);
const mode = process.argv[2];

if (mode !== "--write" && mode !== "--check") {
  console.error("Usage: node scripts/sync-supabase-types.mjs --write|--check");
  process.exit(2);
}

const result = spawnSync(
  "corepack",
  [
    "pnpm",
    "--config.registry=https://registry.npmjs.org",
    "dlx",
    "supabase@2.109.1",
    "gen",
    "types",
    "--local",
    "--schema",
    "public"
  ],
  {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
    maxBuffer: 10 * 1024 * 1024
  }
);

if (result.status !== 0 || !result.stdout.startsWith("export type Json")) {
  process.stderr.write(result.stderr);
  console.error("Failed to generate Supabase database types.");
  process.exit(result.status || 1);
}

const generated = result.stdout.endsWith("\n")
  ? result.stdout
  : `${result.stdout}\n`;

if (mode === "--write") {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, generated, "utf8");
  console.log(`Updated ${target.slice(root.length + 1)}`);
  process.exit(0);
}

let current = "";
try {
  current = readFileSync(target, "utf8");
} catch {
  // The drift message below also covers a missing generated file.
}

if (current !== generated) {
  console.error(
    "Supabase database types are stale. Run `corepack pnpm db:types`."
  );
  process.exit(1);
}

console.log("Supabase database types match the local schema.");
