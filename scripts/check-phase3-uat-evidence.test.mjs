import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  AUTOMATED_SCENARIOS,
  CANONICAL_ORIGIN,
  OWNER_SCENARIOS,
  REQUIRED_SCENARIOS,
  parseEvidence,
  validateEvidence
} from "./check-phase3-uat-evidence.mjs";

const scriptPath = path.resolve("scripts/check-phase3-uat-evidence.mjs");

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
      ? "command: corepack pnpm test; commit: 124c8ab"
      : "pending owner observation",
    scenarioId,
    status: automated ? "PASS" : "PENDING",
    utcObserved: automated ? "2026-07-28T04:00:00Z" : "—",
    ...overrides
  };
}

function artifact(overrides = new Map()) {
  const rows = REQUIRED_SCENARIOS.map((scenarioId) => {
    const row = rowFor(scenarioId, overrides.get(scenarioId) ?? {});
    return `| ${row.scenarioId} | ${row.status} | ${row.evidenceClass} | ${row.utcObserved} | ${row.canonicalOrigin} | ${row.expected} | ${row.observed} | ${row.proof} | ${row.notes} |`;
  }).join("\n");

  return `# Phase 3 evidence

| Scenario ID | Status | Evidence class | UTC observed | Canonical origin | Expected | Observed | Proof | Notes |
|---|---|---|---|---|---|---|---|---|
${rows}
`;
}

function withEvidence(source, callback) {
  const directory = mkdtempSync(path.join(tmpdir(), "soji-phase3-evidence-"));
  const evidencePath = path.join(directory, "evidence.md");
  writeFileSync(evidencePath, source, "utf8");
  return callback(evidencePath);
}

function runCli(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: "utf8"
  });
}

test("accepts every fixed automated PASS and truthful owner PENDING row exactly once", () => {
  const source = artifact();
  assert.equal(parseEvidence(source).length, REQUIRED_SCENARIOS.length);
  assert.equal(validateEvidence(source).valid, true);
  assert.equal(AUTOMATED_SCENARIOS.length, 20);
  assert.equal(OWNER_SCENARIOS.length, 6);
});

test("rejects missing, duplicate, unknown, and malformed status rows", () => {
  const first = REQUIRED_SCENARIOS[0];
  const missing = artifact().replace(
    new RegExp(`^\\| ${first} .*\\n`, "m"),
    ""
  );
  assert.match(validateEvidence(missing).errors.join("\n"), /is missing/);

  const duplicate = artifact()
    .split("\n")
    .find((line) => line.startsWith(`| ${first} `));
  assert.ok(duplicate);
  assert.match(
    validateEvidence(`${artifact()}\n${duplicate}\n`).errors.join("\n"),
    /appears 2 times/
  );

  assert.match(
    validateEvidence(artifact().replace(first, "PH3-UNKNOWN")).errors.join(
      "\n"
    ),
    /not a recognized Phase 3 scenario/
  );
  assert.match(
    validateEvidence(
      artifact().replace(`| ${first} | PASS |`, `| ${first} | COMPLETE |`)
    ).errors.join("\n"),
    /invalid status COMPLETE/
  );
});

test("automated PASS requires named command and commit evidence", () => {
  const scenarioId = AUTOMATED_SCENARIOS[0];
  for (const proof of [
    "repository tests passed",
    "command: corepack pnpm test",
    "commit: 124c8ab"
  ]) {
    const result = validateEvidence(
      artifact(new Map([[scenarioId, { proof }]]))
    );
    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /command.*commit/i);
  }
});

test("owner PASS requires a UTC canonical redacted live observation", () => {
  const scenarioId = OWNER_SCENARIOS[0];
  const valid = artifact(
    new Map([
      [
        scenarioId,
        {
          canonicalOrigin: CANONICAL_ORIGIN,
          evidenceClass: "live",
          notes: "No target or account value recorded.",
          observed: "Redacted live observation matched the expected state.",
          proof: "redacted operator observation",
          status: "PASS",
          utcObserved: "2026-07-28T04:05:00Z"
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
    const invalid = valid.replace(
      "Redacted live observation matched the expected state.",
      observed
    );
    assert.match(
      validateEvidence(invalid).errors.join("\n"),
      /live observation|fabricated/i
    );
  }
});

test("ready mode requires all rows to be live or automated PASS", () => {
  assert.match(
    validateEvidence(artifact(), { ready: true }).errors.join("\n"),
    /must be PASS/
  );

  const overrides = new Map(
    OWNER_SCENARIOS.map((scenarioId) => [
      scenarioId,
      {
        canonicalOrigin: CANONICAL_ORIGIN,
        evidenceClass: "live",
        notes: "No private value recorded.",
        observed: "Redacted live observation matched the expected state.",
        proof: "redacted operator observation",
        status: "PASS",
        utcObserved: "2026-07-28T04:05:00Z"
      }
    ])
  );
  assert.equal(validateEvidence(artifact(overrides), { ready: true }).valid, true);
});

test("rejects URLs, email, secrets, cookies, full IDs, and provider payloads", () => {
  const samples = [
    "https://unexpected.invalid/path",
    "person@unexpected.invalid",
    "SUPABASE_SERVICE_ROLE_KEY=hidden",
    "sk_live_hidden-value",
    "whsec_hidden-value",
    "Cookie: session=hidden",
    "Authorization: Bearer hidden",
    "access_token=hidden",
    "evt_1234567890ABCDEFGHI",
    "raw provider payload"
  ];

  for (const sample of samples) {
    const result = validateEvidence(`${artifact()}\n${sample}\n`);
    assert.equal(result.valid, false, sample);
  }
});

test("module import is silent and CLI structure passes while ready fails", () => {
  const imported = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", `await import(${JSON.stringify(scriptPath)})`],
    { encoding: "utf8" }
  );
  assert.equal(imported.status, 0);
  assert.equal(imported.stdout, "");
  assert.equal(imported.stderr, "");

  withEvidence(artifact(), (evidencePath) => {
    assert.equal(runCli([evidencePath]).status, 0);
    assert.notEqual(runCli([evidencePath, "--ready"]).status, 0);
  });
});
