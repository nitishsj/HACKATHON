import express from "express";
import careQueueApp from "./server/_core/index";

// Vercel recognizes this root Express entrypoint and serves it as a Node Function.
const app = express();
app.use(careQueueApp);

export default app;
