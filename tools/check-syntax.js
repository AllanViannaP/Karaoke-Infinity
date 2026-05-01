"use strict";

const { readFileSync } = require("fs");
const { spawnSync } = require("child_process");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

const checks = [
  { file: "server.js", mode: "script" },
  { file: "public/js/app.js", mode: "module" },
  { file: "public/js/i18n.js", mode: "module" },
  { file: "public/js/scoring.js", mode: "module" },
  { file: "public/js/youtube.js", mode: "module" }
];

function runCheck({ file, mode }) {
  const absolutePath = path.join(rootDir, file);
  const args = mode === "module" ? ["--check", "--input-type=module"] : ["--check", absolutePath];
  const options = {
    cwd: rootDir,
    encoding: "utf8",
    input: mode === "module" ? readFileSync(absolutePath, "utf8") : undefined
  };
  const result = spawnSync(process.execPath, args, options);

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    throw new Error(`Syntax check failed: ${file}`);
  }

  console.log(`ok ${file}`);
}

try {
  checks.forEach(runCheck);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
