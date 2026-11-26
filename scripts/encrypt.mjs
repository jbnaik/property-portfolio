// Usage: npm run encrypt [-- path/to/data.json]
// Reads plaintext portfolio JSON and writes site/data.enc.json. Password from PORTFOLIO_PASSWORD or a prompt.
import { readFile, writeFile } from "node:fs/promises";
import { encryptJson } from "../site/js/crypto.js";
import { validatePortfolio } from "../site/js/validate.js";
import { askHidden } from "./prompt.mjs";

const input = process.argv[2] || "data.json";
const output = new URL("../site/data.enc.json", import.meta.url);

const data = JSON.parse(await readFile(input, "utf8"));
const errors = validatePortfolio(data);
if (errors.length) {
  console.error(`${input} has problems:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

const password = await askHidden("Password: ");
if (password.length < 8) {
  console.error("Use a password of at least 8 characters.");
  process.exit(1);
}
if (!process.env.PORTFOLIO_PASSWORD && (await askHidden("Confirm password: ")) !== password) {
  console.error("Passwords don't match.");
  process.exit(1);
}

await writeFile(output, JSON.stringify(await encryptJson(data, password)) + "\n");
console.log(`Encrypted ${data.properties.length} properties from ${input} -> site/data.enc.json`);
