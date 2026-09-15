#!/usr/bin/env node

import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { execSync } from "node:child_process";

const allowedTypes = ["feat", "fix", "chore"];

const toSlug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const rl = readline.createInterface({ input, output });

try {
  const typeAnswer = (
    await rl.question("Branch type (feat/fix/chore) [feat]: ")
  ).trim();
  const type = typeAnswer || "feat";

  if (!allowedTypes.includes(type)) {
    console.error("Invalid type. Use one of: feat, fix, chore.");
    process.exit(1);
  }

  const nameAnswer = (await rl.question("Branch name: ")).trim();
  const slug = toSlug(nameAnswer);

  if (!slug) {
    console.error("Branch name is required.");
    process.exit(1);
  }

  const branchName = `${type}/${slug}`;
  execSync(`git checkout -b "${branchName}"`, { stdio: "inherit" });
  console.log(`Created and switched to ${branchName}`);
} catch {
  process.exit(1);
} finally {
  rl.close();
}

