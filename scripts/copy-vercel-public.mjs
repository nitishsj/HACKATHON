import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "dist", "public");
const destination = path.join(root, "public");

try {
  await fs.access(path.join(source, "index.html"));
} catch {
  throw new Error(`Vite build output is missing: ${path.join(source, "index.html")}`);
}

await fs.rm(destination, { recursive: true, force: true });
await fs.mkdir(destination, { recursive: true });
await fs.cp(source, destination, { recursive: true });
for (const routeFile of ["staff.html", "display.html", "404.html"]) {
  await fs.copyFile(path.join(source, "index.html"), path.join(destination, routeFile));
}
console.log("Copied Vite assets and SPA route entrypoints into Vercel's public/ directory.");
