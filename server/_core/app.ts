import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { registerTwilioStatusRoute } from "../twilioWebhook";
import { createContext } from "./context";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";

/**
 * Builds the Express app with all API routes registered.
 *
 * Kept free of `listen()`/static-file/Vite concerns so it can run both as a
 * long-lived local server (see ./index.ts) and inside a Vercel serverless
 * function (see ../../api/index.ts), where requests arrive through a handler
 * instead of a listening socket.
 */
export function createApp() {
  const app = express();
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerTwilioStatusRoute(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  return app;
}
