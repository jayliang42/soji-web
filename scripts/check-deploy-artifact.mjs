import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repositoryRoot = process.cwd();
const standaloneRoot = path.join(repositoryRoot, "apps/web/.next/standalone");
const serverEntry = path.join(standaloneRoot, "apps/web/server.js");
const forbiddenNames = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local"
]);

async function collectForbiddenFiles(directory) {
  const findings = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      findings.push(...(await collectForbiddenFiles(absolutePath)));
    } else if (forbiddenNames.has(entry.name)) {
      findings.push(path.relative(repositoryRoot, absolutePath));
    }
  }

  return findings;
}

try {
  const entryStats = await stat(serverEntry);
  if (!entryStats.isFile()) {
    throw new Error("standalone server entry is not a file");
  }

  const serverSource = await readFile(serverEntry, "utf8");
  if (!serverSource.includes("process.env.PORT")) {
    throw new Error("standalone server entry does not honor the PORT environment variable");
  }

  const forbiddenFiles = await collectForbiddenFiles(standaloneRoot);
  if (forbiddenFiles.length > 0) {
    throw new Error(`standalone artifact contains environment files: ${forbiddenFiles.join(", ")}`);
  }

  console.log("Standalone Web artifact is present, runtime-portable, and contains no environment files.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Deploy artifact check failed: ${message}`);
  process.exitCode = 1;
}
