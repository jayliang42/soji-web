import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import {
  AUTOMATED_SCENARIOS,
  CANONICAL_ORIGIN,
  OWNER_SCENARIOS,
  REQUIRED_SCENARIOS,
  parseEvidence,
  validateEvidence
} from "./check-phase4-uat-evidence.mjs";

const scriptPath = path.resolve("scripts/check-phase4-uat-evidence.mjs");

function rowFor(scenarioId, overrides = {}) {
  const automated = AUTOMATED_SCENARIOS.includes(scenarioId);
  return {
    canonicalOrigin: automated ? "local-repository" : "—",
    evidenceClass: automated ? "automated" : "owner",
    expected: `Expected contract for ${scenarioId}.`,
    notes: automated
      ? "No external outcome claimed."
      : "Awaiting the consolidated owner checkpoint.",
    observed: automated
      ? "Repository command completed successfully."
      : "Pending owner observation.",
    proof: automated
      ? "command: corepack pnpm test; commit: c260635"
      : "pending owner observation",
    scenarioId,
    status: automated ? "PASS" : "PENDING",
    utcObserved: automated ? "2026-07-28T05:00:00Z" : "—",
    ...overrides
  };
}

function artifact(overrides = new Map()) {
  const rows = REQUIRED_SCENARIOS.map((scenarioId) => {
    const row = rowFor(scenarioId, overrides.get(scenarioId) ?? {});
    return `| ${row.scenarioId} | ${row.status} | ${row.evidenceClass} | ${row.utcObserved} | ${row.canonicalOrigin} | ${row.expected} | ${row.observed} | ${row.proof} | ${row.notes} |`;
  }).join("\n");

  return `# Phase 4 evidence

| Scenario ID | Status | Evidence class | UTC observed | Canonical origin | Expected | Observed | Proof | Notes |
|---|---|---|---|---|---|---|---|---|
${rows}
`;
}

function runCli(source, extraArgs = []) {
  const directory = mkdtempSync(path.join(tmpdir(), "soji-phase4-evidence-"));
  const evidencePath = path.join(directory, "evidence.md");
  writeFileSync(evidencePath, source, "utf8");
  return spawnSync(process.execPath, [scriptPath, evidencePath, ...extraArgs], {
    encoding: "utf8"
  });
}

test("accepts every fixed automated PASS and owner PENDING row exactly once", () => {
  const source = artifact();
  assert.equal(parseEvidence(source).length, REQUIRED_SCENARIOS.length);
  assert.equal(validateEvidence(source).valid, true);
  assert.ok(AUTOMATED_SCENARIOS.length >= 14);
  assert.ok(OWNER_SCENARIOS.length >= 40);
});

test("rejects missing, duplicate, unknown, and malformed rows", () => {
  const first = REQUIRED_SCENARIOS[0];
  const row = artifact()
    .split("\n")
    .find((line) => line.startsWith(`| ${first} `));
  assert.ok(row);
  assert.match(
    validateEvidence(artifact().replace(`${row}\n`, "")).errors.join("\n"),
    /is missing/
  );
  assert.match(
    validateEvidence(`${artifact()}\n${row}\n`).errors.join("\n"),
    /appears 2 times/
  );
  assert.match(
    validateEvidence(artifact().replace(first, "PH4-UNKNOWN")).errors.join("\n"),
    /not a recognized Phase 4 scenario/
  );
  assert.match(
    validateEvidence(
      artifact().replace(`| ${first} | PASS |`, `| ${first} | COMPLETE |`)
    ).errors.join("\n"),
    /invalid status COMPLETE/
  );
});

test("automated PASS requires repository command and commit proof", () => {
  const scenarioId = AUTOMATED_SCENARIOS[0];
  for (const proof of [
    "repository tests passed",
    "command: corepack pnpm test",
    "commit: c260635"
  ]) {
    const result = validateEvidence(
      artifact(new Map([[scenarioId, { proof }]]))
    );
    assert.match(result.errors.join("\n"), /command.*commit/i);
  }
});

test("owner PASS requires UTC canonical redacted live observation", () => {
  const scenarioId = OWNER_SCENARIOS[0];
  const valid = artifact(
    new Map([
      [
        scenarioId,
        {
          canonicalOrigin: CANONICAL_ORIGIN,
          evidenceClass: "live",
          notes: "No private value recorded.",
          observed: "Redacted live observation matched the expected state.",
          proof: "redacted operator observation",
          status: "PASS",
          utcObserved: "2026-07-28T05:05:00Z"
        }
      ]
    ])
  );
  assert.equal(validateEvidence(valid).valid, true);

  for (const observed of [
    "Repository tests passed.",
    "Mock fixture passed.",
    "Configuration-only verification."
  ]) {
    assert.match(
      validateEvidence(
        valid.replace(
          "Redacted live observation matched the expected state.",
          observed
        )
      ).errors.join("\n"),
      /live observation|fabricated/i
    );
  }
});

test("ready mode fails on exactly the truthful owner rows", () => {
  const result = validateEvidence(artifact(), { ready: true });
  assert.equal(result.valid, false);
  assert.equal(
    result.errors.filter((error) => /must be PASS/u.test(error)).length,
    OWNER_SCENARIOS.length
  );
});

test("rejects private destinations, identities, paths, payloads, and raw messages", () => {
  const samples = [
    "https://unexpected.invalid/path",
    "person@unexpected.invalid",
    "OPS_ALERT_WEBHOOK_URL=hidden",
    "CRON_SECRET=hidden",
    "Cookie: session=hidden",
    "Authorization: Bearer hidden",
    "access_token=hidden",
    "evt_1234567890ABCDEFGHI",
    "storage path: private/hidden.pdf",
    "receiver destination: hidden",
    "user identity: hidden",
    "raw provider payload",
    "raw error message: connection refused"
  ];

  for (const sample of samples) {
    const result = validateEvidence(`${artifact()}\n${sample}\n`);
    assert.equal(result.valid, false, sample);
  }
});

test("module import is silent and structure passes while ready fails", () => {
  const imported = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", `await import(${JSON.stringify(scriptPath)})`],
    { encoding: "utf8" }
  );
  assert.equal(imported.status, 0);
  assert.equal(imported.stdout, "");
  assert.equal(imported.stderr, "");
  assert.equal(runCli(artifact()).status, 0);
  assert.notEqual(runCli(artifact(), ["--ready"]).status, 0);
});
