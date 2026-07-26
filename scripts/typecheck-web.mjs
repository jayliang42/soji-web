import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = path.join(repositoryRoot, "apps/web");
const nextEnvironmentPath = path.join(webRoot, "next-env.d.ts");
const executableSuffix = process.platform === "win32" ? ".cmd" : "";

function run(command, args, env = process.env) {
  const result = spawnSync(`${command}${executableSuffix}`, args, {
    cwd: webRoot,
    env,
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    return false;
  }
  return true;
}

const nextEnvironment = readFileSync(nextEnvironmentPath, "utf8");
let generated = false;

try {
  generated = run("next", ["typegen"], {
    ...process.env,
    NEXT_DIST_DIR: ".next-typecheck"
  });
} finally {
  writeFileSync(nextEnvironmentPath, nextEnvironment);
}

if (generated) {
  run("tsc", ["-p", "tsconfig.typecheck.json", "--noEmit"]);
}
