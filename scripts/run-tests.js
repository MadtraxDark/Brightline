import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const frontend = join(root, "frontend");
const source = join(frontend, "src");

function collect(dir, found = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) collect(path, found);
    else if (name.endsWith(".test.js")) found.push(path);
  }
  return found;
}

const files = collect(source).sort();
const rows = [];
let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--test", file], {
    cwd: frontend,
    encoding: "utf8",
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  process.stdout.write(output);
  if (!output.endsWith("\n")) process.stdout.write("\n");
  const tests = Number(output.match(/ℹ tests (\d+)/)?.[1] ?? "0");
  const ok = result.status === 0;
  if (!ok) failed = true;
  rows.push({
    file: relative(root, file).replaceAll("\\", "/"),
    status: ok ? "passou" : "falhou",
    tests,
  });
}

const nameWidth = Math.max(
  "arquivo".length,
  ...rows.map((row) => row.file.length),
);
const statusWidth = "passou ou falhou".length;
console.log(
  `\n${"arquivo".padEnd(nameWidth)}  ${"passou ou falhou".padEnd(statusWidth)}  testes`,
);
for (const row of rows) {
  console.log(
    `${row.file.padEnd(nameWidth)}  ${row.status.padEnd(statusWidth)}  ${row.tests}`,
  );
}
process.exit(failed ? 1 : 0);
