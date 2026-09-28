import { defineConfig } from "drizzle-kit";
import { getDatabaseConfig } from "./server/databaseConfig";

const databaseConfig = getDatabaseConfig();
if (!databaseConfig) {
  throw new Error(
    "Set DATABASE_URL or the TIDB_HOST/TIDB_PORT/TIDB_USER/TIDB_PASSWORD/TIDB_DATABASE variables before running Drizzle commands"
  );
}

const dbCredentials =
  databaseConfig.kind === "url"
    ? { url: databaseConfig.url }
    : databaseConfig.drizzleCredentials;

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials,
});
