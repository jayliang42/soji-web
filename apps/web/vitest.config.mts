import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
const webSource = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  oxc: {
    jsx: { runtime: "automatic" }
  },
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${webSource}/` },
      {
        find: "@soji/domain",
        replacement: `${workspaceRoot}/packages/domain/src/index.ts`
      },
      {
        find: "@soji/types",
        replacement: `${workspaceRoot}/packages/types/src/index.ts`
      }
    ]
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"]
  }
});
