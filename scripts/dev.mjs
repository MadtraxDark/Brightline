import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] ?? "all";
if (!["all", "frontend", "backend"].includes(mode)) {
  console.error("Uso: node scripts/dev.mjs [frontend|backend]");
  process.exit(1);
}

const pythonCandidates =
  process.platform === "win32"
    ? ["backend/.venv/Scripts/python.exe", ".venv/Scripts/python.exe"]
    : ["backend/.venv/bin/python", ".venv/bin/python"];
const localPython = pythonCandidates
  .map((path) => join(root, path))
  .find(existsSync);
const python =
  localPython ?? (process.platform === "win32" ? "python" : "python3");
const vite = join(root, "frontend/node_modules/vite/bin/vite.js");

// Validate both services before starting either one.
if (mode !== "backend" && !existsSync(vite)) {
  console.error("Instale o frontend na raiz com: npm run install:frontend");
  process.exit(1);
}
if (mode !== "frontend") {
  const check = spawnSync(
    python,
    ["-c", "import uvicorn, fastapi, httpx, dotenv, psycopg"],
    {
      cwd: join(root, "backend"),
      stdio: "ignore",
      windowsHide: true,
    },
  );
  if (check.error || check.status !== 0) {
    console.error(
      "Configure o ambiente Python e instale backend/requirements.txt. Veja o README na raiz.",
    );
    process.exit(1);
  }
}

const children = new Set();
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    // Uvicorn's reload worker must stop with its parent on Windows.
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch (error) {
        if (error.code !== "ESRCH") console.error(error.message);
      }
    }
  }
}

function start(name, command, args, folder) {
  const child = spawn(command, args, {
    cwd: join(root, folder),
    stdio: "inherit",
    windowsHide: true,
    detached: process.platform !== "win32",
  });
  children.add(child);
  child.once("error", (error) => {
    children.delete(child);
    console.error(`[${name}] ${error.message}`);
    stop(1);
  });
  child.once("exit", (code, signal) => {
    children.delete(child);
    if (!stopping) {
      console.error(
        `[${name}] Serviço encerrado${signal ? ` (${signal})` : ` (código ${code})`}.`,
      );
      stop(code || 1);
    }
  });
}

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

console.log("Brightline · Ctrl+C para encerrar os serviços.");
if (mode !== "frontend") {
  start(
    "backend",
    python,
    [
      "-m",
      "uvicorn",
      "app.main:app",
      "--reload",
      "--host",
      "127.0.0.1",
      "--port",
      "8000",
    ],
    "backend",
  );
}
if (mode !== "backend") {
  start(
    "frontend",
    process.execPath,
    [vite, "--host", "127.0.0.1", "--port", "5173", "--strictPort"],
    "frontend",
  );
}
