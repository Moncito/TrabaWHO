import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateCatalog } from "../src/catalog";

const path = fileURLToPath(new URL("../catalog.json", import.meta.url));
const errors = validateCatalog(JSON.parse(readFileSync(path, "utf8")));

if (errors.length) {
  console.error(`catalog.json has ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("catalog.json OK");
