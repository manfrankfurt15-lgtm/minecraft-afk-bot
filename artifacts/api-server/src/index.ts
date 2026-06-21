import app from "./app";
import { logger } from "./lib/logger";
import { spawn } from "child_process";
import path from "path";

// Wie viele Accounts sind in MS_AUTH_CACHE?
function countAccounts(): number {
  const raw = process.env.MS_AUTH_CACHE;
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length;
    return 1; // altes Format: ein Account
  } catch {
    return 0;
  }
}

// Startet einen Bot-Prozess für einen bestimmten Account
function startBot(accountIndex: number) {
  const workspaceRoot = path.resolve(__dirname, "../../..");
  const label = `Bot #${accountIndex + 1}`;

  const bot = spawn(
    "pnpm",
    ["--filter", "@workspace/scripts", "run", "afk-bot"],
    {
      stdio: "inherit",
      cwd: workspaceRoot,
      env: { ...process.env, BOT_ACCOUNT_INDEX: String(accountIndex) },
    }
  );

  bot.on("exit", (code) => {
    logger.warn({ code, accountIndex }, `${label} beendet — Neustart in 10s`);
    setTimeout(() => startBot(accountIndex), 10_000);
  });

  bot.on("error", (err) => {
    logger.error({ err, accountIndex }, `${label} Fehler — Neustart in 10s`);
    setTimeout(() => startBot(accountIndex), 10_000);
  });

  logger.info({ accountIndex }, `${label} gestartet`);
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  const total = countAccounts();
  if (total === 0) {
    logger.warn("Kein MS_AUTH_CACHE gefunden — kein Bot gestartet");
    return;
  }

  logger.info({ total }, `Starte ${total} Bot(s)...`);
  for (let i = 0; i < total; i++) {
    // Etwas Verzögerung zwischen den Starts damit der Server nicht überlastet wird
    setTimeout(() => startBot(i), i * 3_000);
  }
});
