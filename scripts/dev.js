const { spawn } = require("node:child_process");
const { createInterface } = require("node:readline");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const python = path.join(root, "backend", ".venv", "Scripts", "python.exe");
const processes = [];
let stopping = false;

function pipeLines(stream, label, output) {
  const lines = createInterface({ input: stream });
  lines.on("line", (line) => output.write(`[${label}] ${line}\n`));
}

function start(label, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: ["inherit", "pipe", "pipe"],
    ...options,
  });
  processes.push(child);
  pipeLines(child.stdout, label, process.stdout);
  pipeLines(child.stderr, label, process.stderr);
  child.on("error", (error) => {
    process.stderr.write(`[${label}] Could not start: ${error.message}\n`);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      process.stderr.write(`[${label}] exited (${signal || code}). Stopping the other service.\n`);
      stop(code || 1);
    }
  });
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of processes) {
    if (child.exitCode !== null || child.signalCode !== null || !child.pid) continue;
    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      killer.on("error", () => child.kill());
    } else {
      child.kill("SIGTERM");
    }
  }
  process.exitCode = exitCode;
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

if (process.platform !== "win32") {
  process.stderr.write("The backend npm script currently expects the Windows virtual environment.\n");
  process.exit(1);
}

start("backend", python, ["-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--reload", "--port", "8000"]);
start("frontend", "npm", ["--prefix", "frontend", "run", "dev"], { shell: true });
process.stdout.write("Starting backend on :8000 and frontend on :3000. Press Ctrl+C to stop both.\n");
