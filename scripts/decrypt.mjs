// Usage: npm run decrypt [-- output.json] [--force]
// Recovers plaintext JSON from site/data.enc.json, e.g. on a new machine.
import { readFile, writeFile, access } from "node:fs/promises";
import { decryptJson } from "../site/js/crypto.js";
import { askHidden } from "./prompt.mjs";

const args = process.argv.slice(2);
const force = args.includes("--force");
const output = args.find((a) => !a.startsWith("--")) || "data.json";

if (!force && (await access(output).then(() => true, () => false))) {
  console.error(`${output} already exists. Re-run with --force to overwrite.`);
  process.exit(1);
}

const payload = JSON.parse(await readFile(new URL("../site/data.enc.json", import.meta.url), "utf8"));
try {
  const { data } = await decryptJson(payload, await askHidden("Password: "));
  await writeFile(output, JSON.stringify(data, null, 2) + "\n");
  console.log(`Decrypted site/data.enc.json -> ${output} (gitignored, do not commit)`);
} catch {
  console.error("Wrong password or corrupted file.");
  process.exit(1);
}
