import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "..");
const directories = [
  join(root, "src", "lib", "luna"),
  join(root, "src", "components", "luna"),
  join(root, "server"),
];
const forbidden = /\b(acknowledge|registerAction|advance|reset)\b/;

function files(dir, found = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files(path, found);
    else if (name.endsWith(".js")) found.push(path);
  }
  return found;
}

test("Luna não confirma, registra, avança nem reinicia o relógio", () => {
  const hits = [];
  for (const dir of directories) {
    for (const file of files(dir)) {
      if (file.endsWith(`${join("server", "readonly.test.js")}`)) continue;
      const source = readFileSync(file, "utf8");
      if (forbidden.test(source)) hits.push(file);
    }
  }
  assert.deepEqual(hits, []);
});
