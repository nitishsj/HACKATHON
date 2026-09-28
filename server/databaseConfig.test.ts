import { describe, expect, it } from "vitest";
import { getDatabaseConfig } from "./databaseConfig";

describe("getDatabaseConfig", () => {
  it("prefers an existing MySQL DATABASE_URL", () => {
    expect(
      getDatabaseConfig({
        DATABASE_URL: "mysql://local/test",
        TIDB_HOST: "tidb.example",
      })
    ).toEqual({ kind: "url", url: "mysql://local/test" });
  });

  it("uses TiDB Marketplace General variables with TLS and a small pool", () => {
    const config = getDatabaseConfig({
      TIDB_HOST: "cluster.example",
      TIDB_PORT: "4000",
      TIDB_USER: "demo-user",
      TIDB_PASSWORD: "demo-password",
      TIDB_DATABASE: "clinic",
    });

    expect(config).toMatchObject({
      kind: "tidb",
      poolOptions: {
        host: "cluster.example",
        port: 4000,
        user: "demo-user",
        password: "demo-password",
        database: "clinic",
        ssl: { minVersion: "TLSv1.2" },
        connectionLimit: 2,
        enableKeepAlive: true,
      },
      drizzleCredentials: {
        host: "cluster.example",
        port: 4000,
        database: "clinic",
        ssl: { minVersion: "TLSv1.2" },
      },
    });
  });

  it("defaults TiDB's port to 4000", () => {
    expect(
      getDatabaseConfig({
        TIDB_HOST: "cluster.example",
        TIDB_USER: "demo-user",
        TIDB_PASSWORD: "demo-password",
        TIDB_DATABASE: "clinic",
      })
    ).toMatchObject({ kind: "tidb", poolOptions: { port: 4000 } });
  });

  it("returns no configuration for incomplete or invalid TiDB credentials", () => {
    expect(getDatabaseConfig({ TIDB_HOST: "cluster.example" })).toBeUndefined();
    expect(
      getDatabaseConfig({
        TIDB_HOST: "cluster.example",
        TIDB_PORT: "99999",
        TIDB_USER: "demo-user",
        TIDB_PASSWORD: "demo-password",
        TIDB_DATABASE: "clinic",
      })
    ).toBeUndefined();
  });
});
