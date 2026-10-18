import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const source = join(dirname(fileURLToPath(import.meta.url)), "../frontend/src");
const allowed = join(source, "styles", "tokens.css");
const color =
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b|\brgba?\(|\bhsla?\(/g;

function files(dir, found = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files(path, found);
    else if (/\.(css|jsx)$/.test(name) && path !== allowed) found.push(path);
  }
  return found;
}

const hits = [];
for (const file of files(source)) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const match of line.matchAll(color)) {
      hits.push(
        `${relative(source, file).replaceAll("\\", "/")}:${index + 1}: ${match[0]}`,
      );
    }
  });
}

if (hits.length === 0) {
  console.log("Nenhuma cor fora de tokens.css.");
  process.exit(0);
}
for (const hit of hits) console.log(hit);
console.log(`\n${hits.length} cor(es) fora de tokens.css.`);
process.exit(1);
