import { test } from "node:test";
import assert from "node:assert/strict";
import { encryptJson, decryptJson, decryptWithKey, exportKey, importKey } from "../site/js/crypto.js";

test("encrypt/decrypt round trip", async () => {
  const data = { properties: [{ id: "a", name: "Test" }] };
  const payload = await encryptJson(data, "correct horse");
  assert.ok(!JSON.stringify(payload).includes("Test"));
  const { data: out, key } = await decryptJson(payload, "correct horse");
  assert.deepEqual(out, data);
  const reimported = await importKey(await exportKey(key));
  assert.deepEqual(await decryptWithKey(payload, reimported), data);
});

test("wrong password fails", async () => {
  const payload = await encryptJson({ properties: [] }, "right password");
  await assert.rejects(decryptJson(payload, "wrong password"));
});
