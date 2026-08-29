import { defineConfig } from "drizzle-kit";
import path from "path";
import fs from "fs";

if (!process.env.DATABASE_URL) {
  const possibleEnvFiles = [
    path.resolve(__dirname, "../../.env"),
    path.resolve(__dirname, "../../.env.example"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), ".env.example"),
  ];
  for (const envFile of possibleEnvFiles) {
    if (fs.existsSync(envFile)) {
      if (typeof process.loadEnvFile === "function") {
        try {
          process.loadEnvFile(envFile);
        } catch {}
      }
      if (process.env.DATABASE_URL) break;
    }
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is missing. Please ensure DATABASE_URL is defined in .env or system environment.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
