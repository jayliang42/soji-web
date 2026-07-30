import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FORBIDDEN_SECRET_NAMES = Object.freeze([
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CRON_SECRET",
  "OPS_ALERT_WEBHOOK_URL"
]);
const RESOURCE_PATTERN =
  /^soji-phase5-(?:prior|candidate)-[a-f0-9]{8}$/;
const IMAGE_PATTERN =
  /^[a-z0-9][a-z0-9._/-]*:(?:[a-z0-9._-]*-)?[a-f0-9]{40}$/i;
const MIN_DRILL_PORT = 3400;
const MAX_DRILL_PORT = 3499;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function forbiddenMaterial(value) {
  const source = typeof value === "string" ? value : JSON.stringify(value);
  if (
    /(?:^|[\s/])\.env(?:\.[A-Za-z0-9_-]+)?(?:$|[\s/])/i.test(source)
  ) {
    return "environment file";
  }
  for (const name of FORBIDDEN_SECRET_NAMES) {
    if (
      new RegExp(
        `(?:^|[^A-Z0-9_])${name}["']?\\s*(?:=|:)`,
        "i"
      ).test(source)
    ) {
      return "secret assignment";
    }
  }
  return null;
}

export function validateImageInspection(raw) {
  const image = Array.isArray(raw) ? raw[0] : raw;
  if (!isPlainObject(image)) {
    throw new Error("image inspection must contain one image");
  }
  const config = image.Config ?? image.config;
  if (!isPlainObject(config)) {
    throw new Error("image inspection is missing final config");
  }
  if (config.User !== "nextjs") {
    throw new Error("image final user must be exactly nextjs");
  }
  if (
    !Array.isArray(config.Cmd) ||
    config.Cmd.length !== 2 ||
    config.Cmd[0] !== "node" ||
    config.Cmd[1] !== "apps/web/server.js"
  ) {
    throw new Error("image entry must be node apps/web/server.js");
  }
  if (
    !isPlainObject(config.ExposedPorts) ||
    !Object.hasOwn(config.ExposedPorts, "3000/tcp")
  ) {
    throw new Error("image must expose container port 3000");
  }
  const healthTest = config.Healthcheck?.Test;
  if (
    !Array.isArray(healthTest) ||
    healthTest.length !== 4 ||
    healthTest[0] !== "CMD" ||
    healthTest[1] !== "node" ||
    healthTest[2] !== "-e" ||
    healthTest[3] !==
      "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
  ) {
    throw new Error("image healthcheck must use the exact loopback liveness command");
  }

  for (const value of [
    config.Env ?? [],
    config.Labels ?? {},
    image.history ?? image.History ?? []
  ]) {
    const finding = forbiddenMaterial(value);
    if (finding) {
      throw new Error(`image contains forbidden ${finding}`);
    }
  }

  return {
    entry: "node apps/web/server.js",
    healthcheck: true,
    port: 3000,
    user: "nextjs"
  };
}

export function validateOwnedResourceName(name, ownedNames) {
  if (
    typeof name !== "string" ||
    !RESOURCE_PATTERN.test(name) ||
    !(ownedNames instanceof Set) ||
    !ownedNames.has(name)
  ) {
    throw new Error("container target is not an exact owned resource");
  }
  return name;
}

function validateImageName(value, label) {
  if (
    typeof value !== "string" ||
    value.endsWith(":latest") ||
    !IMAGE_PATTERN.test(value)
  ) {
    throw new Error(`${label} image must use an immutable SHA-derived tag`);
  }
  return value;
}

function validatePort(value, label) {
  if (
    !Number.isInteger(value) ||
    value < MIN_DRILL_PORT ||
    value > MAX_DRILL_PORT
  ) {
    throw new Error(`${label} port must be in the fixed drill range`);
  }
  return value;
}

function dockerStep(operation, args) {
  return { args, command: "docker", kind: "docker", operation };
}

function healthStep(operation, name, port) {
  return { kind: "health", name, operation, port };
}

export function createRollbackDrillPlan({
  candidateImage,
  candidatePort,
  priorImage,
  priorPort,
  suffix
}) {
  validateImageName(priorImage, "prior");
  validateImageName(candidateImage, "candidate");
  if (priorImage === candidateImage) {
    throw new Error("prior and candidate image tags must be distinct");
  }
  validatePort(priorPort, "prior");
  validatePort(candidatePort, "candidate");
  if (priorPort === candidatePort) {
    throw new Error("prior and candidate ports must be distinct");
  }
  if (typeof suffix !== "string" || !/^[a-f0-9]{8}$/.test(suffix)) {
    throw new Error("resource suffix must be eight lowercase hex characters");
  }

  const priorName = `soji-phase5-prior-${suffix}`;
  const candidateName = `soji-phase5-candidate-${suffix}`;
  const ownedNames = [priorName, candidateName];
  const ownedSet = new Set(ownedNames);
  validateOwnedResourceName(priorName, ownedSet);
  validateOwnedResourceName(candidateName, ownedSet);

  return {
    ownedNames,
    steps: [
      dockerStep("prior_start", [
        "run",
        "--detach",
        "--name",
        priorName,
        "--publish",
        `127.0.0.1:${priorPort}:3000`,
        priorImage
      ]),
      healthStep("prior_initial_health", priorName, priorPort),
      dockerStep("candidate_start", [
        "run",
        "--detach",
        "--name",
        candidateName,
        "--publish",
        `127.0.0.1:${candidatePort}:3000`,
        candidateImage
      ]),
      healthStep(
        "candidate_initial_health",
        candidateName,
        candidatePort
      ),
      dockerStep("candidate_select", [
        "inspect",
        "--format",
        "{{.State.Running}}",
        candidateName
      ]),
      dockerStep("prior_stop", ["stop", priorName]),
      healthStep(
        "candidate_selected_health",
        candidateName,
        candidatePort
      ),
      dockerStep("candidate_stop", ["stop", candidateName]),
      dockerStep("prior_restart", ["start", priorName]),
      healthStep("prior_restored_health", priorName, priorPort),
      dockerStep("candidate_cleanup", ["rm", "--force", candidateName]),
      dockerStep("prior_cleanup", ["rm", "--force", priorName])
    ]
  };
}

function createdNameFor(operation, args) {
  if (operation !== "prior_start" && operation !== "candidate_start") {
    return null;
  }
  const nameIndex = args.indexOf("--name");
  return nameIndex === -1 ? null : args[nameIndex + 1];
}

async function cleanupCreated({ createdNames, ownedNames, runner }) {
  const ownedSet = new Set(ownedNames);
  for (const name of [...createdNames].reverse()) {
    validateOwnedResourceName(name, ownedSet);
    try {
      await runner({
        args: ["rm", "--force", name],
        command: "docker",
        operation: `${name.includes("-candidate-") ? "candidate" : "prior"}_cleanup`
      });
    } catch {
      // The stable failure result intentionally excludes Docker output.
    }
  }
}

export async function executeRollbackDrill({
  healthProbe,
  plan,
  runner
}) {
  if (
    !isPlainObject(plan) ||
    !Array.isArray(plan.ownedNames) ||
    !Array.isArray(plan.steps) ||
    typeof healthProbe !== "function" ||
    typeof runner !== "function"
  ) {
    throw new Error("rollback drill requires a validated plan and runners");
  }
  const ownedSet = new Set(plan.ownedNames);
  const createdNames = [];
  let healthChecks = 0;

  for (const step of plan.steps) {
    try {
      if (step.kind === "health") {
        validateOwnedResourceName(step.name, ownedSet);
        const healthy = await healthProbe(step);
        if (healthy !== true) {
          throw new Error("health probe failed");
        }
        healthChecks += 1;
        continue;
      }
      if (
        step.kind !== "docker" ||
        step.command !== "docker" ||
        !Array.isArray(step.args)
      ) {
        throw new Error("rollback plan contains an invalid command");
      }
      const createdName = createdNameFor(step.operation, step.args);
      if (createdName) {
        validateOwnedResourceName(createdName, ownedSet);
        createdNames.push(createdName);
      }
      const result = await runner(step);
      if (!result || result.status !== 0) {
        throw new Error("Docker command failed");
      }
      if (step.operation.endsWith("_cleanup")) {
        const name = step.args.at(-1);
        validateOwnedResourceName(name, ownedSet);
        const index = createdNames.indexOf(name);
        if (index !== -1) {
          createdNames.splice(index, 1);
        }
      }
    } catch {
      await cleanupCreated({ createdNames, ownedNames: plan.ownedNames, runner });
      return { failedAt: step.operation, ok: false };
    }
  }

  return { healthChecks, ok: true };
}

function dockerRunner({ args }) {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: 30_000
  });
  return { status: result.status ?? 1, stdout: result.stdout };
}

function inspectImage(image) {
  validateImageName(image, "container");
  const inspection = spawnSync("docker", ["image", "inspect", image], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: 30_000
  });
  if (inspection.status !== 0) {
    throw new Error("immutable image inspection failed");
  }
  const history = spawnSync(
    "docker",
    ["history", "--no-trunc", "--format", "{{json .}}", image],
    {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 30_000
    }
  );
  if (history.status !== 0) {
    throw new Error("immutable image history inspection failed");
  }
  let parsedInspection;
  try {
    parsedInspection = JSON.parse(inspection.stdout);
  } catch {
    throw new Error("Docker returned malformed image inspection");
  }
  const parsedHistory = history.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        throw new Error("Docker returned malformed image history");
      }
    });
  const imageData = parsedInspection[0];
  return validateImageInspection({ ...imageData, history: parsedHistory });
}

async function probeHealth({ port }) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal: AbortSignal.timeout(1_000)
      });
      if (response.status === 200) {
        const payload = await response.json();
        if (
          isPlainObject(payload) &&
          payload.ok === true &&
          payload.status === "alive"
        ) {
          return true;
        }
      }
    } catch {
      // Retry without retaining or printing response/error details.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function optionValue(args, option) {
  const index = args.indexOf(option);
  if (index === -1 || !args[index + 1] || args[index + 1].startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  if (args.indexOf(option, index + 1) !== -1) {
    throw new Error(`${option} may appear only once`);
  }
  return args[index + 1];
}

function validatePairedOptions(args, allowedOptions) {
  if ((args.length - 1) / 2 !== allowedOptions.length) {
    throw new Error("rollback drill requires exactly two named image options");
  }
  const seen = new Set();
  for (let index = 1; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (
      !allowedOptions.includes(option) ||
      seen.has(option) ||
      !value ||
      value.startsWith("--")
    ) {
      throw new Error("rollback drill contains an unknown or malformed option");
    }
    seen.add(option);
  }
}

async function runCli(args) {
  if (args[0] === "--inspect") {
    const image = args[1];
    if (!image || args.length !== 2) {
      throw new Error("--inspect requires exactly one immutable image");
    }
    inspectImage(image);
    process.stdout.write("Phase 5 image inspection passed.\n");
    return;
  }
  if (args[0] === "--drill") {
    validatePairedOptions(args, ["--prior-image", "--candidate-image"]);
    const priorImage = optionValue(args, "--prior-image");
    const candidateImage = optionValue(args, "--candidate-image");
    inspectImage(priorImage);
    inspectImage(candidateImage);
    const plan = createRollbackDrillPlan({
      candidateImage,
      candidatePort: 3411,
      priorImage,
      priorPort: 3410,
      suffix: randomBytes(4).toString("hex")
    });
    const result = await executeRollbackDrill({
      healthProbe: probeHealth,
      plan,
      runner: dockerRunner
    });
    if (!result.ok) {
      throw new Error(`Phase 5 rollback drill failed (${result.failedAt})`);
    }
    process.stdout.write(
      `Phase 5 rollback drill passed (${result.healthChecks} health checks).\n`
    );
    return;
  }
  throw new Error(
    "usage: --inspect IMAGE or --drill --prior-image IMAGE --candidate-image IMAGE"
  );
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Phase 5 container gate failed"}\n`
    );
    process.exitCode = 1;
  });
}
