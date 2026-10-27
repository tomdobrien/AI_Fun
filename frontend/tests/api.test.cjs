const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const code = ts.transpileModule(fs.readFileSync(require.resolve("../lib/api.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function loadApi(storage, requests, response) {
  const context = { exports: {}, process: { env: { NODE_ENV: "development" } },
    window: { dispatchEvent: () => {}, sessionStorage: { getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) } },
    fetch: async (url, options) => { requests.push({ url, ...options }); return response(); }, URLSearchParams, Event };
  vm.runInNewContext(code, context);
  return context.exports.api;
}

for (const role of ["admin", "uploader"]) {
  test(`${role} session survives refresh, expires, and clears on logout`, async () => {
    const storage = new Map();
    const requests = [];
    const token = role === "admin" ? "123.signature" : "upload.1.123.signature";
    let status = 200;
    const response = () => ({ ok: status === 200, status, json: async () => ({ token, email: "alice@example.com", displayName: "Alice" }) });
    let api = loadApi(storage, requests, response);
    if (role === "admin") await api.loginAdmin("password");
    else await api.loginUploadUser("alice@example.com", "password");
    api = loadApi(storage, requests, response);
    assert.ok(role === "admin" ? await api.getAdminSession() : await api.getUploadSession());
    assert.equal(requests.at(-1).headers.Authorization, `Bearer ${token}`);
    assert.equal(requests.at(-1).credentials, "omit");
    status = 401;
    assert.equal(role === "admin" ? await api.getAdminSession() : await api.getUploadSession(), role === "admin" ? false : null);
    assert.equal(storage.size, 0);
    status = 200;
    if (role === "admin") { await api.loginAdmin("password"); await api.logoutAdmin(); }
    else { await api.loginUploadUser("alice@example.com", "password"); api.clearUploadSession(); }
    assert.equal(storage.size, 0);
    api = loadApi(storage, requests, response);
    assert.equal(role === "admin" ? await api.getAdminSession() : await api.getUploadSession(), role === "admin" ? false : null);
  });
}

test("oversized upload is rejected before sending", async () => {
  const requests = [];
  const api = loadApi(new Map(), requests, () => { throw Error("Unexpected request"); });
  await assert.rejects(api.uploadPhoto({ size: 500 * 1024 * 1024 + 1 }), /500 MB/);
  assert.equal(requests.length, 0);
});
