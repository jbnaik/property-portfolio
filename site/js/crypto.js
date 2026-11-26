// AES-256-GCM with a PBKDF2-SHA256 derived key. Uses Web Crypto, so it runs in browsers and Node >= 20.
const ITERATIONS = 600000;
const VERSION = 1;

const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();

function toBase64(bytes) {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function deriveKey(password, salt, iterations = ITERATIONS) {
  const base = await subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptJson(data, password) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const plaintext = enc.encode(JSON.stringify(data));
  const ciphertext = await subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return {
    v: VERSION,
    kdf: "PBKDF2-SHA256",
    iterations: ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(ciphertext),
  };
}

export async function decryptWithKey(payload, key) {
  const plaintext = await subtle.decrypt({ name: "AES-GCM", iv: fromBase64(payload.iv) }, key, fromBase64(payload.data));
  return JSON.parse(dec.decode(plaintext));
}

export async function decryptJson(payload, password) {
  const key = await deriveKey(password, fromBase64(payload.salt), payload.iterations);
  return { data: await decryptWithKey(payload, key), key };
}

export async function exportKey(key) {
  return toBase64(await subtle.exportKey("raw", key));
}

export async function importKey(b64) {
  return subtle.importKey("raw", fromBase64(b64), { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}
