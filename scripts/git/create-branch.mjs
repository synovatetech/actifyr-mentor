#!/usr/bin/env node

import { execSync } from "node:child_process";

const type = process.argv[2];
const nameArg = process.argv.slice(3).join(" ").trim();

const supportedTypes = new Set(["feat", "fix", "chore"]);

if (!supportedTypes.has(type)) {
  console.error("Invalid branch type. Use one of: feat, fix, chore.");
  process.exit(1);
}

if (!nameArg) {
  console.error(`Usage: npm run branch:${type} -- <branch-name>`);
  process.exit(1);
}

const slug = nameArg
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .replace(/-{2,}/g, "-");

if (!slug) {
  console.error("Branch name is empty after formatting. Use letters/numbers.");
  process.exit(1);
}

const branchName = `${type}/${slug}`;

try {
  execSync(`git checkout -b "${branchName}"`, { stdio: "inherit" });
} catch {
  process.exit(1);
}

