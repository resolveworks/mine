import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let script: string | null = null;

export function getInjectableScript(): string {
  if (script === null) {
    script = fs.readFileSync(
      path.join(__dirname, "lib", "idcac-compiled.js"),
      "utf-8",
    );
  }
  return script;
}
