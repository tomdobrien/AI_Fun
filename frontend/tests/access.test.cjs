const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve("../lib/access.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, context);
const { routeAllowed, isPublicRoute } = context.exports;

test("intro, resume and policies are public; files and unknown routes stay protected", () => {
  for (const path of ["/", "/resume", "/privacy", "/terms", "/acceptable-use", "/guild-bounty"]) {
    assert.equal(isPublicRoute(path), true);
    assert.equal(routeAllowed(path, null, []), true);
  }
  for (const path of ["/upload", "/admin", "/invite", "/unknown"]) assert.equal(isPublicRoute(path), false);
  assert.equal(routeAllowed("/upload", null, ["files:view"]), false);
  assert.equal(routeAllowed("/unknown", null, []), false);
});

test("file access still requires a current account grant", () => {
  const account = { isAdmin: false, permissions: [] };
  assert.equal(routeAllowed("/upload", account, []), false);
  assert.equal(routeAllowed("/resume", account, []), true);
  for (const permission of ["files:upload", "files:view"]) {
    assert.equal(routeAllowed("/upload", { ...account, permissions: [permission] }, []), true);
  }
  assert.equal(routeAllowed("/upload", { isAdmin: true, permissions: [] }, []), true);
});
