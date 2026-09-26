import fs from "node:fs";
import path from "node:path";

/** Loads .env.local for scripts that run outside Next.js (no-op when absent). */
export function loadLocalEnv() {
  const file = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match || line.trimStart().startsWith("#")) continue;
    if (process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

export const E2E = {
  owner: {
    email: process.env.E2E_OWNER_EMAIL ?? "e2e-owner@example.test",
    password: process.env.E2E_OWNER_PASSWORD ?? "e2e-password-123!",
  },
  member: {
    email: process.env.E2E_MEMBER_EMAIL ?? "e2e-member@example.test",
    password: process.env.E2E_MEMBER_PASSWORD ?? "e2e-password-123!",
  },
  workspaceSlug: "e2e-tables",
  workspaceName: "E2E Tables",
};

export const STORAGE = {
  owner: "tests/e2e/.auth/owner.json",
  member: "tests/e2e/.auth/member.json",
};
