import express from "express";
import path from "path";
import cors from "cors";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import apiRouter from "./artifacts/api-server/src/routes/index";
import { seedDemoData } from "./artifacts/api-server/src/lib/seed";
import { initDb } from "./lib/db/src/index";

// Load environment variables from .env or .env.example if available
for (const envFile of [".env", ".env.example"]) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    try {
      if (typeof process.loadEnvFile === "function") {
        process.loadEnvFile(envPath);
      }
    } catch {}
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 4001;

app.use(
  cors({
    credentials: true,
    origin: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes mounted FIRST
app.use("/api", apiRouter);

async function startServer() {
  try {
    await initDb();
    await seedDemoData();
  } catch (err) {
    console.warn("[Server] Warning during db/seed initialization:", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0", hmr: false, ws: false },
      appType: "spa",
      configFile: path.resolve(process.cwd(), "artifacts/seiiki-listrik/vite.config.ts"),
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "artifacts/seiiki-listrik/dist/public");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SEIIKI fullstack server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[Server] Fatal startup error:", err);
  process.exit(1);
});
