import { decryptJson, decryptWithKey, encryptJson, exportKey, importKey } from "./crypto.js";
import { validatePortfolio } from "./validate.js";
import { escapeHtml } from "./format.js";
import * as views from "./views.js";

const KEY_STORE = "pp:key";
const app = document.getElementById("app");
const nav = document.getElementById("nav");
const state = { payload: null, data: null };

function storedKey() {
  try {
    return sessionStorage.getItem(KEY_STORE) || localStorage.getItem(KEY_STORE);
  } catch {
    return null;
  }
}

function saveKey(raw, remember) {
  try {
    (remember ? localStorage : sessionStorage).setItem(KEY_STORE, raw);
  } catch {}
}

function clearKey() {
  try {
    sessionStorage.removeItem(KEY_STORE);
    localStorage.removeItem(KEY_STORE);
  } catch {}
}

function lock() {
  clearKey();
  state.data = null;
  showLogin();
}

async function loadPayload() {
  const res = await fetch("data.enc.json", { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Could not load data.enc.json (HTTP ${res.status})`);
  return res.json();
}

function showLogin(error = "") {
  nav.hidden = true;
  app.innerHTML = `
    <form class="card login" id="login-form">
      <div class="brand big">Portfolio</div>
      <p class="muted">Enter your password to decrypt your portfolio.</p>
      <input type="password" id="password" placeholder="Password" autocomplete="current-password" autofocus required/>
      <label class="check"><input type="checkbox" id="remember"/> Remember on this device</label>
      <button class="btn primary" type="submit" id="unlock">Unlock</button>
      <div class="msg error">${escapeHtml(error)}</div>
    </form>`;
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("unlock");
    btn.disabled = true;
    btn.textContent = "Decrypting…";
    try {
      const { data, key } = await decryptJson(state.payload, document.getElementById("password").value);
      saveKey(await exportKey(key), document.getElementById("remember").checked);
      state.data = data;
      route();
    } catch {
      showLogin("Wrong password, or the data file is corrupted.");
    }
  });
}

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

function bindEditor() {
  const editor = document.getElementById("json-editor");
  const msg = document.getElementById("editor-msg");
  const say = (text, cls) => { msg.className = `msg ${cls}`; msg.innerHTML = text; };
  const parse = () => {
    let data;
    try { data = JSON.parse(editor.value); } catch (e) { say(`Invalid JSON: ${escapeHtml(e.message)}`, "error"); return null; }
    const errors = validatePortfolio(data);
    if (errors.length) { say(`<ul>${errors.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`, "error"); return null; }
    return data;
  };
  document.getElementById("btn-apply")?.addEventListener("click", () => {
    const data = parse();
    if (data) { state.data = data; say("Valid. Preview applied to this tab. Download the encrypted file to save it.", "ok"); }
  });
  document.getElementById("btn-download-plain").addEventListener("click", () => {
    const data = parse();
    if (data) download("data.json", JSON.stringify(data, null, 2));
  });
  document.getElementById("btn-download-enc").addEventListener("click", async () => {
    const data = parse();
    if (!data) return;
    const p1 = document.getElementById("enc-password").value;
    const p2 = document.getElementById("enc-password2").value;
    if (p1.length < 8) return say("Use a password of at least 8 characters.", "error");
    if (p1 !== p2) return say("Passwords don't match.", "error");
    say("Encrypting…", "");
    const payload = await encryptJson(data, p1);
    download("data.enc.json", JSON.stringify(payload));
    say("Downloaded. Replace <code>site/data.enc.json</code> in your repo with it and push.", "ok");
  });
}

function setActive(name) {
  for (const a of nav.querySelectorAll("a[data-route]")) a.classList.toggle("active", a.dataset.route === name);
}

function route() {
  if (!state.data) return showLogin();
  nav.hidden = false;
  const [, page = "overview", arg] = location.hash.split("/");
  setActive(page === "property" ? "properties" : page);
  const render = {
    overview: () => views.overview(state.data),
    properties: () => views.properties(state.data),
    property: () => views.property(state.data, decodeURIComponent(arg || "")),
    cashflow: () => views.cashflow(state.data),
    data: () => views.dataEditor(state.data),
  }[page] || (() => views.overview(state.data));
  app.innerHTML = render();
  if (page === "data") bindEditor();
  window.scrollTo(0, 0);
}

app.addEventListener("click", (e) => {
  const row = e.target.closest("tr[data-href]");
  if (row) location.hash = row.dataset.href;
});
document.getElementById("lock").addEventListener("click", lock);
window.addEventListener("hashchange", route);

async function start() {
  try {
    state.payload = await loadPayload();
  } catch (e) {
    app.innerHTML = `<div class="card msg error">${escapeHtml(e.message)}</div>`;
    return;
  }
  if (!state.payload) {
    const sample = await fetch("data.sample.json").then((r) => r.json());
    app.innerHTML = views.dataEditor(sample, { setup: true });
    bindEditor();
    return;
  }
  const raw = storedKey();
  if (raw) {
    try {
      state.data = await decryptWithKey(state.payload, await importKey(raw));
    } catch {
      clearKey();
    }
  }
  route();
}

start();
