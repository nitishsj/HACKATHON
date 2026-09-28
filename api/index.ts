// Vercel serverless entry point. Static files are served by Vercel's CDN (see
// vercel.json rewrites); only /api/* and /manus-storage/* reach this function.
// Do not import ./server/_core/index.ts here — it calls server.listen(),
// which is illegal inside a serverless function.
import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../server/_core/app";

const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  app(req, res);
}
