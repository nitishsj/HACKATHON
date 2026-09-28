import { once } from "node:events";
import type { AddressInfo } from "node:net";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { encodeOAuthState } from "../shared/const";
import { registerOAuthRoutes } from "./_core/oauth";

describe("OAuth callback recovery route", () => {
  const app = express();
  registerOAuthRoutes(app);
  let server: ReturnType<typeof app.listen> | undefined;
  let baseUrl = "";

  beforeAll(async () => {
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
  });

  it("returns an expired or missing nonce to the same staff route with a recoverable app error", async () => {
    const state = encodeOAuthState({
      redirectUri: "https://clinic.example/api/oauth/callback",
      nonce: "nonce-from-provider-flow",
      returnPath: "/staff",
    });
    const query = new URLSearchParams({ code: "synthetic-test-code", state });
    const response = await fetch(`${baseUrl}/api/oauth/callback?${query}`, { redirect: "manual" });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/staff?authError=expired");
  });
});
