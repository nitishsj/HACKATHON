import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState } from "../../shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const returnOrigin = "https://carequeue.invalid";
const defaultReturnPath = "/staff";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/** Keep redirects on the app origin; state may be malformed or legacy. */
export function getSafeOAuthReturnPath(state?: string): string {
  if (!state) return defaultReturnPath;
  const candidate = decodeOAuthState(state).returnPath;
  if (typeof candidate !== "string" || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return defaultReturnPath;
  }
  try {
    const target = new URL(candidate, returnOrigin);
    if (target.origin !== returnOrigin) return defaultReturnPath;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return defaultReturnPath;
  }
}

function withLoginError(returnPath: string, reason: "incomplete" | "expired" | "failed") {
  const target = new URL(returnPath, returnOrigin);
  target.searchParams.set("authError", reason);
  return `${target.pathname}${target.search}${target.hash}`;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const returnPath = getSafeOAuthReturnPath(state);

    // Keep error recovery in the app's own staff page rather than leaving users
    // stranded on a raw JSON callback response from the auth endpoint.
    if (!code || !state) {
      res.redirect(302, withLoginError(returnPath, "incomplete"));
      return;
    }

    // The same-tab login may take longer than a few minutes (e.g. Google MFA).
    // The one-time state cookie is valid for 30 minutes and is checked before
    // code exchange to bind this callback to the browser that started the flow.
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.redirect(302, withLoginError(returnPath, "expired"));
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.redirect(302, withLoginError(returnPath, "failed"));
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, returnPath);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.redirect(302, withLoginError(returnPath, "failed"));
    }
  });
}
