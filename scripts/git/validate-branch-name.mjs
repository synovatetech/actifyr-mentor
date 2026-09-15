#!/usr/bin/env node

import { execSync } from "node:child_process";

const allowedDirect = new Set(["main", "master", "develop", "vizz-dev"]);
const pattern =
  /^(feat|fix|chore|docs|refactor|test|ci)\/[a-z0-9]+(?:-[a-z0-9]+)*$|^(release|hotfix)\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

let branchName = "";
try {
  branchName = execSync("git rev-parse --abbrev-ref HEAD", {
    stdio: ["ignore", "pipe", "ignore"],
  })
    .toString()
    .trim();
} catch {
  console.error("Unable to detect current branch.");
  process.exit(1);
}

if (allowedDirect.has(branchName) || pattern.test(branchName)) {
  process.exit(0);
}

console.error("Invalid branch name for commit.");
console.error(
  "Use: feat/*, fix/*, chore/*, docs/*, refactor/*, test/*, ci/*, release/*, hotfix/*"
);
console.error("Allowed direct branches: main, master, develop, vizz-dev");
process.exit(1);

