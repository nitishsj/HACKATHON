export type DatabaseEnvironment = Record<string, string | undefined>;

export type DatabaseConfig =
  | { kind: "url"; url: string }
  | {
      kind: "tidb";
      poolOptions: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
        ssl: { minVersion: "TLSv1.2" };
        waitForConnections: true;
        connectionLimit: 2;
        enableKeepAlive: true;
      };
      drizzleCredentials: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
        ssl: { minVersion: "TLSv1.2" };
      };
    };

/**
 * Resolve a normal MySQL URL first, otherwise use the variables installed by
 * Vercel's TiDB Cloud integration (General framework). TiDB public endpoints
 * require TLS; the Starter service uses a publicly trusted certificate, so
 * Node's normal certificate verification remains enabled.
 */
export function getDatabaseConfig(
  env: DatabaseEnvironment = process.env
): DatabaseConfig | undefined {
  const url = env.DATABASE_URL?.trim();
  if (url) return { kind: "url", url };

  const host = env.TIDB_HOST?.trim();
  const port = Number(env.TIDB_PORT || 4000);
  const user = env.TIDB_USER;
  const password = env.TIDB_PASSWORD;
  const database = env.TIDB_DATABASE?.trim();

  if (!host || !user || password === undefined || !database) return undefined;
  if (!Number.isInteger(port) || port < 1 || port > 65535) return undefined;

  const connection = {
    host,
    port,
    user,
    password,
    database,
    ssl: { minVersion: "TLSv1.2" as const },
  };

  return {
    kind: "tidb",
    drizzleCredentials: connection,
    poolOptions: {
      ...connection,
      waitForConnections: true,
      connectionLimit: 2,
      enableKeepAlive: true,
    },
  };
}
