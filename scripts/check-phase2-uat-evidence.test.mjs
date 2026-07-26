import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  CANONICAL_ORIGIN,
  REQUIRED_READINESS_CHECKS,
  REQUIRED_SCENARIOS,
  REQUIRED_SCHEMA_CHECKS,
  parseDeploymentInspection,
  parseDryRun,
  parseEvidence,
  parseMigrationList,
  probeCanonicalReadiness,
  probeProductionSchema,
  validateDeployment,
  validateEvidence,
  validatePostpush,
  validatePrepush,
  validateReleaseInputs
} from "./check-phase2-uat-evidence.mjs";

const scriptPath = path.resolve(
  "scripts/check-phase2-uat-evidence.mjs"
);

function rowFor(scenarioId, status = "PENDING", overrides = {}) {
  const isPass = status === "PASS";
  const schemaObservation = [
    "localMigrationVersion=20260726000000",
    "remoteMigrationVersion=20260726000000",
    "pendingMigrationCount=0",
    "dryRunPendingCount=0",
    ...REQUIRED_SCHEMA_CHECKS.map((name) => `${name}=true`),
    "observedAt=2026-07-26T19:00:00Z"
  ].join("; ");

  return {
    environment: CANONICAL_ORIGIN,
    expected: `Expected authoritative outcome for ${scenarioId}.`,
    notes: isPass
      ? "Observed through a redacted operator session."
      : "No provider outcome claimed.",
    objectSuffix: isPass ? "AB12CD34" : "—",
    objectType: isPass ? "payment_intent" : "—",
    observed:
      scenarioId === "BILL-DB-SCHEMA-PARITY" && isPass
        ? schemaObservation
        : isPass
          ? "Live Stripe test-mode observation on the canonical deployment."
          : "Pending provider observation.",
    scenarioId,
    status,
    subject: `redacted-${scenarioId.toLowerCase()}`,
    utcDate: "2026-07-26",
    ...overrides
  };
}

function artifact(status = "PENDING", rowOverrides = new Map()) {
  const rows = REQUIRED_SCENARIOS.map((scenarioId) => {
    const row = rowFor(
      scenarioId,
      status,
      rowOverrides.get(scenarioId) ?? {}
    );
    return `| ${row.scenarioId} | ${row.status} | ${row.utcDate} | ${row.environment} | ${row.subject} | ${row.objectType} | ${row.objectSuffix} | ${row.expected} | ${row.observed} | ${row.notes} |`;
  }).join("\n");

  return `# Phase 2 evidence

| Scenario ID | Status | UTC date | Canonical environment | Redacted subject | Object type | Last-8 suffix | Expected | Observed | Notes |
|---|---|---|---|---|---|---|---|---|---|
${rows}
`;
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: "utf8",
    ...options
  });
}

function withEvidence(source, callback) {
  const directory = mkdtempSync(path.join(tmpdir(), "soji-phase2-evidence-"));
  const evidencePath = path.join(directory, "evidence.md");
  writeFileSync(evidencePath, source, "utf8");
  return callback(evidencePath);
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status
  });
}

test("parses exactly 25 fixed pending rows and supports the positive all-status assertion", () => {
  const source = artifact();
  assert.equal(parseEvidence(source).length, 25);
  assert.equal(
    validateEvidence(source, { requireAllStatus: "PENDING" }).valid,
    true
  );
});

test("rejects missing, duplicate, unknown, and mixed-status rows", () => {
  const missing = artifact().replace(
    /^\| BILL-01-CATALOG .*\n/m,
    ""
  );
  assert.match(
    validateEvidence(missing, { requireAllStatus: "PENDING" }).errors.join("\n"),
    /BILL-01-CATALOG is missing/
  );

  const duplicateRow = artifact()
    .split("\n")
    .find((line) => line.startsWith("| BILL-01-CATALOG "));
  assert.ok(duplicateRow);
  assert.match(
    validateEvidence(`${artifact()}\n${duplicateRow}\n`).errors.join("\n"),
    /BILL-01-CATALOG appears 2 times/
  );

  const unknown = artifact().replace(
    "BILL-01-CATALOG",
    "BILL-99-UNKNOWN"
  );
  assert.match(
    validateEvidence(unknown).errors.join("\n"),
    /BILL-99-UNKNOWN is not a recognized Phase 2 scenario/
  );

  const mixed = artifact().replace(
    "| BILL-01-CATALOG | PENDING |",
    "| BILL-01-CATALOG | FAIL |"
  );
  assert.match(
    validateEvidence(mixed, { requireAllStatus: "PENDING" }).errors.join("\n"),
    /BILL-01-CATALOG must be PENDING/
  );
});

test("rejects invalid statuses, dates, environments, subjects, suffixes, and malformed rows", () => {
  const samples = [
    [
      artifact().replace(
        "| BILL-01-CATALOG | PENDING |",
        "| BILL-01-CATALOG | COMPLETE |"
      ),
      /invalid status COMPLETE/
    ],
    [
      artifact().replace("2026-07-26", "07/26/2026"),
      /valid UTC date/
    ],
    [
      artifact().replace(CANONICAL_ORIGIN, "https://preview.example.test"),
      /canonical environment/
    ],
    [
      artifact().replace("redacted-bill-db-schema-parity", "customer-one"),
      /redacted subject/
    ],
    [
      artifact().replace(
        "| BILL-01-CATALOG | PENDING | 2026-07-26 | https://soji-web.vercel.app | redacted-bill-01-catalog | — | — |",
        "| BILL-01-CATALOG | PENDING | 2026-07-26 | https://soji-web.vercel.app | redacted-bill-01-catalog | payment_intent | TOO-LONG-123 |"
      ),
      /last-8 suffix/
    ],
    [
      artifact().replace(
        /^\| BILL-01-CATALOG (.*) \| No provider outcome claimed\. \|$/m,
        "| BILL-01-CATALOG $1 |"
      ),
      /malformed evidence row/
    ]
  ];

  for (const [source, pattern] of samples) {
    const result = validateEvidence(source);
    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), pattern);
  }
});

test("ready and require-pass accept only live canonical PASS observations", () => {
  assert.equal(validateEvidence(artifact("PASS"), { ready: true }).valid, true);
  assert.equal(
    validateEvidence(artifact("PASS"), {
      requirePass: ["BILL-01-CATALOG", "BILL-03-TIER-1-CHECKOUT"]
    }).valid,
    true
  );

  for (const status of ["PENDING", "FAIL", "BLOCKED"]) {
    const result = validateEvidence(artifact(status), {
      requirePass: ["BILL-03-TIER-1-CHECKOUT"]
    });
    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /must be PASS/);
  }

  const unknown = validateEvidence(artifact("PASS"), {
    requirePass: ["BILL-99-UNKNOWN"]
  });
  assert.match(unknown.errors.join("\n"), /unknown required PASS scenario/);
});

test("rejects fabricated or incomplete provider PASS observations", () => {
  const phrases = [
    "Mock fixture passed.",
    "Repository tests passed.",
    "Contract-only verification.",
    "Configuration-only check.",
    "Dry run completed."
  ];

  for (const observed of phrases) {
    const source = artifact(
      "PASS",
      new Map([
        [
          "BILL-03-TIER-1-CHECKOUT",
          { observed }
        ]
      ])
    );
    const result = validateEvidence(source, {
      requirePass: ["BILL-03-TIER-1-CHECKOUT"]
    });
    assert.equal(result.valid, false, observed);
    assert.match(result.errors.join("\n"), /live provider observation|fabrication/i);
  }

  const missingSuffix = artifact(
    "PASS",
    new Map([
      ["BILL-03-TIER-1-CHECKOUT", { objectSuffix: "—" }]
    ])
  );
  assert.match(
    validateEvidence(missingSuffix, {
      requirePass: ["BILL-03-TIER-1-CHECKOUT"]
    }).errors.join("\n"),
    /last-8 suffix/
  );
});

test("schema PASS requires exact versions, zero counts, named booleans, UTC observation, and canonical environment", () => {
  const source = artifact("PASS");
  assert.equal(
    validateEvidence(source, {
      requirePass: ["BILL-DB-SCHEMA-PARITY"]
    }).valid,
    true
  );

  for (const replacement of [
    ["remoteMigrationVersion=20260726000000", "remoteMigrationVersion=20260725000000"],
    ["pendingMigrationCount=0", "pendingMigrationCount=1"],
    ["adjustmentTable=true", "adjustmentTable=false"],
    ["observedAt=2026-07-26T19:00:00Z", "observedAt=not-a-date"]
  ]) {
    const invalid = source.replace(...replacement);
    const result = validateEvidence(invalid, {
      requirePass: ["BILL-DB-SCHEMA-PARITY"]
    });
    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /BILL-DB-SCHEMA-PARITY/);
  }
});

test("rejects secrets, private identifiers, email, card data, and full provider IDs", () => {
  const prohibitedSamples = [
    "Bearer aaaaaaaaaaaa.bbbbbbbbbbbb.cccccccc",
    "SUPABASE_SERVICE_ROLE_KEY=hidden",
    "whsec_hidden-value",
    "sk_live_hidden-value",
    "sk_test_hidden-value",
    "password=hidden",
    "Cookie: session=hidden",
    "Authorization: Basic hidden",
    "access_token: hidden",
    "https://user:secret@database.example",
    "uat-person@example.com",
    "4242 4242 4242 4242",
    "evt_1234567890ABCDEFGHI",
    "pi_1234567890ABCDEFGHI",
    "raw provider payload"
  ];

  for (const sample of prohibitedSamples) {
    const result = validateEvidence(`${artifact()}\n${sample}\n`);
    assert.equal(result.valid, false, `expected rejection for ${sample}`);
  }
});

test("the module is import-safe and the all-status CLI fails closed on parser and file errors", () => {
  const imported = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", `await import(${JSON.stringify(scriptPath)})`],
    { encoding: "utf8" }
  );
  assert.equal(imported.status, 0);
  assert.equal(imported.stdout, "");
  assert.equal(imported.stderr, "");

  withEvidence(artifact(), (evidencePath) => {
    const success = runCli([
      evidencePath,
      "--require-all-status",
      "PENDING"
    ]);
    assert.equal(success.status, 0, success.stderr);

    const wrongStatus = runCli([
      evidencePath,
      "--require-all-status",
      "PASS"
    ]);
    assert.notEqual(wrongStatus.status, 0);
  });

  withEvidence(
    `${artifact()}\n| BILL-01-CATALOG | PENDING |\n`,
    (evidencePath) => {
      const malformed = runCli([
        evidencePath,
        "--require-all-status",
        "PENDING"
      ]);
      assert.notEqual(malformed.status, 0);
    }
  );

  const missingFile = runCli([
    "/definitely/missing/phase2-evidence.md",
    "--require-all-status",
    "PENDING"
  ]);
  assert.notEqual(missingFile.status, 0);
});

const migrationBefore = `
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20260725000000 | 20260725000000 | 2026-07-25 00:00:00
   20260726000000 |                | 2026-07-26 00:00:00
`;
const migrationAfter = `
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20260725000000 | 20260725000000 | 2026-07-25 00:00:00
   20260726000000 | 20260726000000 | 2026-07-26 00:00:00
`;
const dryRunBefore = `
DRY RUN: migrations will *not* be pushed.
Would push these migrations:
 • 20260726000000_subscription_billing_adjustments.sql
`;
const dryRunAfter = `
DRY RUN: migrations will *not* be pushed.
Remote database is up to date.
`;

test("migration and dry-run parsers enforce one reviewed prepush item and zero postpush items", () => {
  assert.deepEqual(parseMigrationList(migrationBefore), {
    local: ["20260725000000", "20260726000000"],
    remote: ["20260725000000"]
  });
  assert.deepEqual(parseDryRun(dryRunBefore), [
    "20260726000000_subscription_billing_adjustments.sql"
  ]);
  assert.deepEqual(
    validatePrepush({
      dryRunSource: dryRunBefore,
      expectedPending: "20260726000000",
      migrationListSource: migrationBefore
    }),
    {
      localVersions: ["20260725000000", "20260726000000"],
      pendingVersions: ["20260726000000"],
      remoteVersions: ["20260725000000"]
    }
  );
  assert.deepEqual(
    validatePostpush({
      dryRunSource: dryRunAfter,
      migrationListSource: migrationAfter
    }),
    {
      localVersions: ["20260725000000", "20260726000000"],
      pendingVersions: [],
      remoteVersions: ["20260725000000", "20260726000000"]
    }
  );
});

test("migration and dry-run parsers fail closed on malformed, duplicate, missing, and extra versions", () => {
  for (const source of [
    migrationBefore.replace("20260726000000", "20260726"),
    `${migrationBefore}\n20260726000000 | | duplicate\n`,
    migrationBefore.replace("20260725000000 | 20260725000000", "               | 20260725000000"),
    migrationBefore.replace("20260726000000 |", "20260727000000 |")
  ]) {
    assert.throws(
      () =>
        validatePrepush({
          dryRunSource: dryRunBefore,
          expectedPending: "20260726000000",
          migrationListSource: source
        }),
      /migration/i
    );
  }

  assert.throws(
    () =>
      validatePrepush({
        dryRunSource: `${dryRunBefore}\n• 20260727000000_extra.sql\n`,
        expectedPending: "20260726000000",
        migrationListSource: migrationBefore
      }),
    /dry-run/i
  );
  assert.throws(() => parseDryRun("Would push these migrations:\nunknown.sql"), /dry-run/i);
});

test("prepush and postpush CLI modes require their exact parser inputs", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "soji-phase2-migrations-"));
  const migrationBeforePath = path.join(directory, "before-list.txt");
  const migrationAfterPath = path.join(directory, "after-list.txt");
  const dryRunBeforePath = path.join(directory, "before-dry-run.txt");
  const dryRunAfterPath = path.join(directory, "after-dry-run.txt");
  writeFileSync(migrationBeforePath, migrationBefore, "utf8");
  writeFileSync(migrationAfterPath, migrationAfter, "utf8");
  writeFileSync(dryRunBeforePath, dryRunBefore, "utf8");
  writeFileSync(dryRunAfterPath, dryRunAfter, "utf8");

  const prepush = runCli([
    "--prepush",
    "--migration-list",
    migrationBeforePath,
    "--dry-run",
    dryRunBeforePath,
    "--expected-pending",
    "20260726000000"
  ]);
  assert.equal(prepush.status, 0, prepush.stderr);

  const postpush = runCli([
    "--postpush",
    "--migration-list",
    migrationAfterPath,
    "--dry-run",
    dryRunAfterPath
  ]);
  assert.equal(postpush.status, 0, postpush.stderr);

  const missingExpected = runCli([
    "--prepush",
    "--migration-list",
    migrationBeforePath,
    "--dry-run",
    dryRunBeforePath
  ]);
  assert.notEqual(missingExpected.status, 0);

  const unexpectedScope = runCli([
    "--prepush",
    "--migration-list",
    migrationBeforePath,
    "--dry-run",
    dryRunBeforePath,
    "--expected-pending",
    "20260726000000",
    "--include-seed"
  ]);
  assert.notEqual(unexpectedScope.status, 0);
});

test("production schema probe requires an exact all-true boolean response and never returns the key", async () => {
  const projectRef = "abcdefghijklmnopqrst";
  const supabaseUrl = `https://${projectRef}.supabase.co`;
  const checks = Object.fromEntries(
    REQUIRED_SCHEMA_CHECKS.map((name) => [name, true])
  );
  let request;
  const result = await probeProductionSchema({
    expectedProjectRef: projectRef,
    fetchImpl: async (url, options) => {
      request = { options, url };
      return jsonResponse([checks]);
    },
    serviceRoleKey: "service-key-must-not-be-returned",
    supabaseUrl
  });

  assert.deepEqual(result, checks);
  assert.equal(
    request.url,
    `${supabaseUrl}/rest/v1/rpc/get_phase2_billing_schema_readiness`
  );
  assert.match(request.options.headers.Authorization, /^Bearer /);
  assert.equal(request.options.redirect, "error");
  assert.doesNotMatch(JSON.stringify(result), /service-key/);

  await assert.rejects(
    probeProductionSchema({
      expectedProjectRef: projectRef,
      fetchImpl: async () =>
        jsonResponse([{ ...checks, receiptAllowlist: false }]),
      serviceRoleKey: "hidden",
      supabaseUrl
    }),
    /receiptAllowlist/
  );
  await assert.rejects(
    probeProductionSchema({
      expectedProjectRef: projectRef,
      fetchImpl: async () => jsonResponse([{ ...checks, catalog: ["private"] }]),
      serviceRoleKey: "hidden",
      supabaseUrl
    }),
    /unexpected schema readiness field/
  );
});

test("production schema probe never sends secrets before exact project-origin validation", async () => {
  const projectRef = "abcdefghijklmnopqrst";
  let fetchCalls = 0;
  const fetchImpl = async () => {
    fetchCalls += 1;
    throw new Error("fetch must not be called");
  };

  for (const supabaseUrl of [
    "https://attacker.example",
    `https://${projectRef}.supabase.co.attacker.example`,
    `https://${projectRef}.supabase.co/redirect`,
    `https://${projectRef}.supabase.co:444`,
    `https://user@${projectRef}.supabase.co`
  ]) {
    await assert.rejects(
      probeProductionSchema({
        expectedProjectRef: projectRef,
        fetchImpl,
        serviceRoleKey: "must-never-leave-process",
        supabaseUrl
      }),
      /Supabase URL|verified Supabase project/
    );
  }

  await assert.rejects(
    probeProductionSchema({
      expectedProjectRef: "attacker.example",
      fetchImpl,
      serviceRoleKey: "must-never-leave-process",
      supabaseUrl: `https://${projectRef}.supabase.co`
    }),
    /independently verified Supabase project ref/
  );
  assert.equal(fetchCalls, 0);
});

const deploymentInspection = {
  aliases: ["soji-web.vercel.app"],
  id: "dpl_publicsuffix",
  meta: {
    githubCommitSha: "0123456789abcdef0123456789abcdef01234567"
  },
  name: "soji-web",
  status: "READY",
  target: "production",
  url: "soji-web-release.vercel.app"
};

test("deployment inspection requires the exact commit, project, production target, READY state, and canonical alias", () => {
  assert.deepEqual(
    parseDeploymentInspection(JSON.stringify(deploymentInspection)),
    {
      aliases: ["https://soji-web.vercel.app"],
      commit: "0123456789abcdef0123456789abcdef01234567",
      deploymentId: "dpl_publicsuffix",
      deploymentUrl: "https://soji-web-release.vercel.app",
      project: "soji-web",
      state: "READY",
      target: "production"
    }
  );
  assert.equal(
    validateDeployment({
      expectedAlias: CANONICAL_ORIGIN,
      expectedCommit: deploymentInspection.meta.githubCommitSha,
      source: JSON.stringify(deploymentInspection)
    }).project,
    "soji-web"
  );

  for (const [field, value] of [
    ["name", "another-project"],
    ["target", "preview"],
    ["status", "ERROR"],
    ["aliases", ["another-project.vercel.app"]],
    ["meta", { githubCommitSha: "f".repeat(40) }]
  ]) {
    const invalid = { ...deploymentInspection, [field]: value };
    assert.throws(
      () =>
        validateDeployment({
          expectedAlias: CANONICAL_ORIGIN,
          expectedCommit: deploymentInspection.meta.githubCommitSha,
          source: JSON.stringify(invalid)
        }),
      /deployment/i
    );
  }
});

test("deployment CLI validates captured JSON against separate commit metadata", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "soji-phase2-deploy-"));
  const inspectionPath = path.join(directory, "inspect.json");
  const commitPath = path.join(directory, "commit.txt");
  writeFileSync(
    inspectionPath,
    JSON.stringify(deploymentInspection),
    "utf8"
  );
  writeFileSync(
    commitPath,
    `${deploymentInspection.meta.githubCommitSha}\n`,
    "utf8"
  );

  const result = runCli([
    "--deployment",
    inspectionPath,
    "--expected-commit-file",
    commitPath,
    "--expected-alias",
    CANONICAL_ORIGIN
  ]);
  assert.equal(result.status, 0, result.stderr);

  writeFileSync(commitPath, `${"f".repeat(40)}\n`, "utf8");
  const mismatch = runCli([
    "--deployment",
    inspectionPath,
    "--expected-commit-file",
    commitPath,
    "--expected-alias",
    CANONICAL_ORIGIN
  ]);
  assert.notEqual(mismatch.status, 0);
});

test("canonical readiness requires 200 health, Supabase source, all named booleans, and a test Stripe key", async () => {
  const checks = Object.fromEntries(
    REQUIRED_READINESS_CHECKS.map((name) => [name, true])
  );
  const fetchImpl = async (url) =>
    url.endsWith("/api/health/ready")
      ? jsonResponse({ checks, ok: true, status: "ready" })
      : jsonResponse({
          entitlements: [],
          error: null,
          source: "supabase",
          user: null
        });

  assert.deepEqual(
    await probeCanonicalReadiness({
      fetchImpl,
      origin: CANONICAL_ORIGIN,
      stripeSecretKey: "sk_test_hidden"
    }),
    { checks, source: "supabase" }
  );

  await assert.rejects(
    probeCanonicalReadiness({
      fetchImpl,
      origin: CANONICAL_ORIGIN,
      stripeSecretKey: "sk_live_hidden"
    }),
    /Stripe test-mode/
  );
  await assert.rejects(
    probeCanonicalReadiness({
      fetchImpl: async (url) =>
        url.endsWith("/api/health/ready")
          ? jsonResponse({ checks: { ...checks, stripeWebhook: false }, ok: false }, 503)
          : jsonResponse({ source: "supabase" }),
      origin: CANONICAL_ORIGIN,
      stripeSecretKey: "sk_test_hidden"
    }),
    /HTTP 200/
  );
  await assert.rejects(
    probeCanonicalReadiness({
      fetchImpl: async (url) =>
        url.endsWith("/api/health/ready")
          ? jsonResponse({ checks, ok: true, status: "ready" })
          : jsonResponse({ source: "demo" }),
      origin: CANONICAL_ORIGIN,
      stripeSecretKey: "sk_test_hidden"
    }),
    /source must be supabase/
  );
});

test("remote CLI modes fail before network access when secure inputs are missing or live", () => {
  const noSchemaEnv = { ...process.env };
  delete noSchemaEnv.NEXT_PUBLIC_SUPABASE_URL;
  delete noSchemaEnv.SUPABASE_URL;
  delete noSchemaEnv.SUPABASE_SERVICE_ROLE_KEY;
  const schema = runCli(["--production-schema"], { env: noSchemaEnv });
  assert.notEqual(schema.status, 0);
  assert.doesNotMatch(schema.stderr, /service-key-must-not-be-returned/);

  const readiness = runCli(
    ["--canonical-readiness", CANONICAL_ORIGIN],
    { env: { ...process.env, STRIPE_SECRET_KEY: "sk_live_hidden" } }
  );
  assert.notEqual(readiness.status, 0);
  assert.match(readiness.stderr, /Stripe test-mode/);
  assert.doesNotMatch(readiness.stderr, /sk_live_hidden/);
});

function createReleaseRepository({ dirty = false, secret = false } = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), "soji-phase2-release-"));
  const files = new Map([
    [".vercelignore", ".env\n.vercel\n"],
    ["apps/web/.env.example", "STRIPE_SECRET_KEY=\n"],
    ["apps/web/next.config.ts", 'export default { output: "standalone" };\n'],
    ["apps/web/package.json", '{"name":"@soji/web","scripts":{"build":"next build"}}\n'],
    ["apps/web/vercel.json", '{"framework":"nextjs"}\n'],
    ["package.json", '{"name":"fixture","packageManager":"pnpm@10.8.1"}\n'],
    ["packages/domain/package.json", '{"name":"@soji/domain"}\n'],
    ["pnpm-lock.yaml", "lockfileVersion: '9.0'\n"],
    ["pnpm-workspace.yaml", "packages:\n  - apps/*\n  - packages/*\n"],
    ["turbo.json", '{"tasks":{"build":{"outputs":[".next/**"]}}}\n']
  ]);

  if (secret) {
    files.set("apps/web/leak.txt", "STRIPE_SECRET_KEY=sk_test_should_fail\n");
  }

  for (const [file, contents] of files) {
    const absolute = path.join(directory, file);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents, "utf8");
  }

  execFileSync("git", ["init", "-q"], { cwd: directory });
  execFileSync("git", ["config", "user.email", "fixture@example.invalid"], {
    cwd: directory
  });
  execFileSync("git", ["config", "user.name", "Fixture"], { cwd: directory });
  execFileSync("git", ["add", "."], { cwd: directory });
  execFileSync("git", ["commit", "-qm", "fixture"], { cwd: directory });
  const commit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: directory,
    encoding: "utf8"
  }).trim();
  execFileSync("git", ["checkout", "--detach", "-q", commit], {
    cwd: directory
  });

  if (dirty) {
    writeFileSync(
      path.join(directory, "apps/web/next.config.ts"),
      "export default {};\n",
      "utf8"
    );
  }

  return { commit, directory };
}

test("release-input validation proves detached exact commit, tracked config, clean inputs, and secret-free values", () => {
  const clean = createReleaseRepository();
  const result = validateReleaseInputs({
    expectedCommit: clean.commit,
    worktreePath: clean.directory
  });
  assert.equal(result.commit, clean.commit);
  assert.equal(result.detached, true);
  assert.ok(result.trackedFiles >= 10);

  const dirty = createReleaseRepository({ dirty: true });
  assert.throws(
    () =>
      validateReleaseInputs({
        expectedCommit: dirty.commit,
        worktreePath: dirty.directory
      }),
    /dirty release input/
  );

  const secret = createReleaseRepository({ secret: true });
  assert.throws(
    () =>
      validateReleaseInputs({
        expectedCommit: secret.commit,
        worktreePath: secret.directory
      }),
    /secret-like tracked value/
  );
});

test("release-input CLI reads only the permission-restricted path and public commit files", () => {
  const clean = createReleaseRepository();
  const directory = mkdtempSync(path.join(tmpdir(), "soji-phase2-release-meta-"));
  const worktreeFile = path.join(directory, "worktree.txt");
  const commitFile = path.join(directory, "commit.txt");
  writeFileSync(worktreeFile, `${clean.directory}\n`, "utf8");
  writeFileSync(commitFile, `${clean.commit}\n`, "utf8");

  const result = runCli([
    "--release-inputs",
    "--worktree-file",
    worktreeFile,
    "--commit-file",
    commitFile
  ]);
  assert.equal(result.status, 0, result.stderr);
});
