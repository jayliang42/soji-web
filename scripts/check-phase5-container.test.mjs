import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  createRollbackDrillPlan,
  executeRollbackDrill,
  validateImageInspection,
  validateOwnedResourceName
} from "./check-phase5-container.mjs";

const priorImage = `soji-web:prior-${"a".repeat(40)}`;
const candidateImage = `soji-web:candidate-${"b".repeat(40)}`;

function validInspection(overrides = {}) {
  return {
    Config: {
      Cmd: ["node", "apps/web/server.js"],
      Env: [
        "NODE_ENV=production",
        "NEXT_TELEMETRY_DISABLED=1",
        "HOSTNAME=0.0.0.0",
        "PORT=3000"
      ],
      ExposedPorts: { "3000/tcp": {} },
      Healthcheck: {
        Test: [
          "CMD",
          "node",
          "-e",
          "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
        ]
      },
      Labels: {},
      User: "nextjs",
      ...overrides
    },
    history: [{ CreatedBy: "COPY standalone /app" }]
  };
}

test("accepts the exact non-root standalone image contract", () => {
  assert.deepEqual(validateImageInspection(validInspection()), {
    entry: "node apps/web/server.js",
    healthcheck: true,
    port: 3000,
    user: "nextjs"
  });
});

test("rejects privileged, incomplete, secret-bearing, and environment-file images", () => {
  const cases = [
    [{ User: "" }, /user/],
    [{ User: "root" }, /user/],
    [{ User: "1001" }, /user/],
    [{ Cmd: ["node", "server.js"] }, /entry/],
    [{ Healthcheck: undefined }, /healthcheck/],
    [{
      Healthcheck: {
        Test: [
          "CMD",
          "sh",
          "-c",
          "curl https://example.com && curl http://127.0.0.1:3000/api/health"
        ]
      }
    }, /healthcheck/],
    [{ ExposedPorts: {} }, /port/],
    [{ Env: ["SUPABASE_SERVICE_ROLE_KEY=private"] }, /secret/],
    [{ Labels: { CRON_SECRET: "private" } }, /secret/]
  ];
  for (const [overrides, message] of cases) {
    assert.throws(
      () => validateImageInspection(validInspection(overrides)),
      message
    );
  }
  assert.throws(
    () =>
      validateImageInspection({
        ...validInspection(),
        history: [{ CreatedBy: "COPY .env.production /app/.env.production" }]
      }),
    /environment file/
  );
  assert.throws(
    () =>
      validateImageInspection({
        ...validInspection(),
        history: [{ CreatedBy: "ARG STRIPE_SECRET_KEY=private" }]
      }),
    /secret/
  );
});

test("validates only exact generated owned resource names", () => {
  const owned = new Set([
    "soji-phase5-prior-deadbeef",
    "soji-phase5-candidate-deadbeef"
  ]);
  assert.equal(
    validateOwnedResourceName("soji-phase5-prior-deadbeef", owned),
    "soji-phase5-prior-deadbeef"
  );
  for (const value of [
    "",
    "soji-web",
    "soji-phase5-prior-*",
    "soji-phase5-prior-deadbeef;rm",
    "soji-phase5-prior-feedface",
    "soji-phase5-prior-deadbeef "
  ]) {
    assert.throws(() => validateOwnedResourceName(value, owned), /owned resource/);
  }
});

test("builds a bounded prior/candidate command plan with loopback-only ports", () => {
  const plan = createRollbackDrillPlan({
    candidateImage,
    candidatePort: 3411,
    priorImage,
    priorPort: 3410,
    suffix: "deadbeef"
  });
  assert.deepEqual(plan.ownedNames, [
    "soji-phase5-prior-deadbeef",
    "soji-phase5-candidate-deadbeef"
  ]);
  assert.deepEqual(
    plan.steps.map(({ kind, operation }) => `${kind}:${operation}`),
    [
      "docker:prior_start",
      "health:prior_initial_health",
      "docker:candidate_start",
      "health:candidate_initial_health",
      "docker:candidate_select",
      "docker:prior_stop",
      "health:candidate_selected_health",
      "docker:candidate_stop",
      "docker:prior_restart",
      "health:prior_restored_health",
      "docker:candidate_cleanup",
      "docker:prior_cleanup"
    ]
  );
  for (const step of plan.steps.filter(({ kind }) => kind === "docker")) {
    assert.equal(step.command, "docker");
    assert.ok(
      ["run", "inspect", "stop", "start", "rm"].includes(step.args[0])
    );
    assert.equal(
      step.args.some((value) => /[;&|*?$`]|\$\{|\b(?:vercel|supabase|migration|database)\b/i.test(value)),
      false
    );
  }
  assert.ok(
    plan.steps.some(({ args = [] }) =>
      args.includes("127.0.0.1:3410:3000")
    )
  );
  assert.ok(
    plan.steps.some(({ args = [] }) =>
      args.includes("127.0.0.1:3411:3000")
    )
  );
});

test("rejects mutable images, duplicate/unsafe ports, and unsafe plan inputs", () => {
  const base = {
    candidateImage,
    candidatePort: 3411,
    priorImage,
    priorPort: 3410,
    suffix: "deadbeef"
  };
  for (const overrides of [
    { candidateImage: "soji-web:latest" },
    { candidateImage: priorImage },
    { candidatePort: 3410 },
    { candidatePort: 3000 },
    { priorPort: 0 },
    { suffix: "*" }
  ]) {
    assert.throws(
      () => createRollbackDrillPlan({ ...base, ...overrides }),
      /(?:image|port|suffix)/
    );
  }
});

test("executes success in order and cleans up exact owned resources", async () => {
  const plan = createRollbackDrillPlan({
    candidateImage,
    candidatePort: 3411,
    priorImage,
    priorPort: 3410,
    suffix: "deadbeef"
  });
  const events = [];
  const result = await executeRollbackDrill({
    healthProbe: async ({ operation }) => {
      events.push(`health:${operation}`);
      return true;
    },
    plan,
    runner: async ({ args, operation }) => {
      events.push(`docker:${operation}:${args.join(" ")}`);
      return { status: 0 };
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.healthChecks, 4);
  assert.match(events.at(-2), /candidate_cleanup/);
  assert.match(events.at(-1), /prior_cleanup/);
});

test("failure and timeout clean up only containers already created, in reverse order", async () => {
  const plan = createRollbackDrillPlan({
    candidateImage,
    candidatePort: 3411,
    priorImage,
    priorPort: 3410,
    suffix: "deadbeef"
  });
  const events = [];
  const result = await executeRollbackDrill({
    healthProbe: async ({ operation }) => {
      events.push(`health:${operation}`);
      return operation !== "candidate_initial_health";
    },
    plan,
    runner: async ({ args, operation }) => {
      events.push(`docker:${operation}:${args.join(" ")}`);
      return { status: 0 };
    }
  });
  assert.deepEqual(result, {
    failedAt: "candidate_initial_health",
    ok: false
  });
  assert.match(events.at(-2), /candidate_cleanup/);
  assert.match(events.at(-1), /prior_cleanup/);
  assert.equal(events.some((event) => /rm.*soji-web(?!-phase5)/.test(event)), false);
});

test("a start command that throws still triggers exact owned cleanup", async () => {
  const plan = createRollbackDrillPlan({
    candidateImage,
    candidatePort: 3411,
    priorImage,
    priorPort: 3410,
    suffix: "deadbeef"
  });
  const events = [];
  const result = await executeRollbackDrill({
    healthProbe: async () => true,
    plan,
    runner: async ({ operation }) => {
      events.push(operation);
      if (operation === "prior_start") {
        throw new Error("runner lost contact after container creation");
      }
      return { status: 0 };
    }
  });
  assert.deepEqual(result, { failedAt: "prior_start", ok: false });
  assert.deepEqual(events, ["prior_start", "prior_cleanup"]);
});

test("module import is silent and starts no Docker process", () => {
  const imported = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `import(${JSON.stringify(pathToFileURL(path.resolve("scripts/check-phase5-container.mjs")).href)})`
    ],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  assert.equal(imported.status, 0);
  assert.equal(imported.stdout, "");
  assert.equal(imported.stderr, "");
});
