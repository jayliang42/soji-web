import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AUTOMATED_SCENARIOS,
  CANONICAL_ORIGIN,
  DEPLOYMENT_OWNER_SCENARIOS,
  OWNER_SCENARIOS,
  PHASE5_OWNER_SCENARIOS,
  RELEASE_COMMANDS,
  REQUIRED_SCENARIOS,
  parseEvidence,
  validateReleaseDocumentation,
  validateEvidence
} from "./check-phase5-uat-evidence.mjs";

const scriptPath = path.resolve("scripts/check-phase5-uat-evidence.mjs");

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
      ? "command: corepack pnpm phase5:release:check; commit: 53882d0"
      : "pending owner observation",
    scenarioId,
    status: automated ? "PASS" : "PENDING",
    utcObserved: automated ? "2026-07-28T05:30:00Z" : "—",
    ...overrides
  };
}

function artifact(overrides = new Map(), scenarioIds = REQUIRED_SCENARIOS) {
  const rows = scenarioIds.map((scenarioId) => {
    const row = rowFor(scenarioId, overrides.get(scenarioId) ?? {});
    return `| ${row.scenarioId} | ${row.status} | ${row.evidenceClass} | ${row.utcObserved} | ${row.canonicalOrigin} | ${row.expected} | ${row.observed} | ${row.proof} | ${row.notes} |`;
  }).join("\n");
  return `# Phase 5 evidence

| Scenario ID | Status | Evidence class | UTC observed | Canonical origin | Expected | Observed | Proof | Notes |
|---|---|---|---|---|---|---|---|---|
${rows}
`;
}

function runCli(source, extraArgs = []) {
  const directory = mkdtempSync(path.join(tmpdir(), "soji-phase5-evidence-"));
  const evidencePath = path.join(directory, "evidence.md");
  writeFileSync(evidencePath, source, "utf8");
  return spawnSync(process.execPath, [scriptPath, evidencePath, ...extraArgs], {
    encoding: "utf8"
  });
}

test("requires exactly ten automated and forty-eight owner scenarios", () => {
  assert.equal(AUTOMATED_SCENARIOS.length, 10);
  assert.equal(PHASE5_OWNER_SCENARIOS.length, 8);
  assert.equal(OWNER_SCENARIOS.length, 48);
  assert.equal(REQUIRED_SCENARIOS.length, 58);
  assert.equal(parseEvidence(artifact()).length, 58);
  assert.equal(validateEvidence(artifact()).valid, true);
});

test("rejects missing, duplicate, unknown, and malformed evidence rows", () => {
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
    validateEvidence(artifact().replace(first, "PH5-UNKNOWN")).errors.join("\n"),
    /not a recognized Phase 5 scenario/
  );
  assert.match(
    validateEvidence(
      artifact().replace(`| ${first} | PASS |`, `| ${first} | COMPLETE |`)
    ).errors.join("\n"),
    /invalid status COMPLETE/
  );
});

test("automated PASS requires UTC local repository command and commit", () => {
  const scenarioId = AUTOMATED_SCENARIOS[0];
  for (const overrides of [
    { canonicalOrigin: CANONICAL_ORIGIN },
    { proof: "repository tests passed" },
    { proof: "command: corepack pnpm test" },
    { proof: "commit: 53882d0" },
    { utcObserved: "today" }
  ]) {
    const result = validateEvidence(
      artifact(new Map([[scenarioId, overrides]]))
    );
    assert.equal(result.valid, false);
  }
});

test("owner PASS requires canonical UTC redacted live proof and bounded deployment suffix", () => {
  const scenarioId = DEPLOYMENT_OWNER_SCENARIOS[0];
  const valid = artifact(
    new Map([
      [
        scenarioId,
        {
          canonicalOrigin: CANONICAL_ORIGIN,
          evidenceClass: "live",
          notes: "No private value recorded.",
          observed:
            "Redacted live observation matched the expected deployment state.",
          proof: "deployment suffix: Ab12Cd34",
          status: "PASS",
          utcObserved: "2026-07-28T05:35:00Z"
        }
      ]
    ])
  );
  assert.equal(validateEvidence(valid).valid, true);

  for (const proof of [
    "configuration-only proof; deployment suffix: Ab12Cd34",
    "fixture proof; deployment suffix: Ab12Cd34",
    "redacted operator observation",
    "deployment suffix: dpl_1234567890"
  ]) {
    const changed = valid.replace(
      "deployment suffix: Ab12Cd34",
      proof
    );
    assert.equal(validateEvidence(changed).valid, false, proof);
  }
});

test("ready mode fails on exactly forty-eight external rows", () => {
  const result = validateEvidence(artifact(), { ready: true });
  assert.equal(result.valid, false);
  assert.equal(
    result.errors.filter((error) => /must be PASS for ready mode/.test(error))
      .length,
    48
  );
  assert.equal(
    result.errors.some((error) =>
      AUTOMATED_SCENARIOS.some((id) => error.startsWith(id))
    ),
    false
  );
});

test("rejects generated URLs, credentials, identities, provider bodies, logs, and full IDs", () => {
  const samples = [
    "https://soji-web-random.vercel.app",
    "dpl_1234567890ABCDEFGHI",
    "person@unexpected.invalid",
    "STRIPE_SECRET_KEY=hidden",
    "Cookie: session=hidden",
    "Authorization: Bearer hidden",
    "access_token=hidden",
    "/Users/private/release.json",
    "user identity: hidden",
    "raw provider body",
    "raw deployment logs",
    "raw error: connection refused",
    "evt_1234567890ABCDEFGHI"
  ];
  for (const sample of samples) {
    const result = validateEvidence(`${artifact()}\n${sample}\n`);
    assert.equal(result.valid, false, sample);
  }
});

test("PENDING owner rows cannot contain observations and non-deployment PASS needs no suffix", () => {
  const pending = OWNER_SCENARIOS[0];
  assert.equal(
    validateEvidence(
      artifact(
        new Map([
          [
            pending,
            {
              canonicalOrigin: CANONICAL_ORIGIN,
              observed: "Something was observed."
            }
          ]
        ])
      )
    ).valid,
    false
  );

  const environmentScenario = "PH5-ENV-READINESS";
  const valid = artifact(
    new Map([
      [
        environmentScenario,
        {
          canonicalOrigin: CANONICAL_ORIGIN,
          evidenceClass: "live",
          notes: "No private value recorded.",
          observed: "Redacted live observation matched readiness.",
          proof: "redacted operator observation",
          status: "PASS",
          utcObserved: "2026-07-28T05:35:00Z"
        }
      ]
    ])
  );
  assert.equal(validateEvidence(valid).valid, true);
});

test("module import is silent; structure CLI passes and ready CLI fails", () => {
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

test("release command inventory is fixed, local-only, and docs preserve one checkpoint", () => {
  assert.equal(RELEASE_COMMANDS.length, 16);
  const serialized = JSON.stringify(RELEASE_COMMANDS);
  assert.doesNotMatch(
    serialized,
    /\b(?:vercel|promote|instant rollback|supabase\s+(?:link|db push)|stripe\s+(?:listen|trigger))\b/i
  );
  assert.deepEqual(validateReleaseDocumentation(process.cwd()), {
    checkpointCount: 1,
    documents: 3
  });
});
