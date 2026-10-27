const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve("../lib/access.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, context);
const { routeAllowed } = context.exports;

test("visitors only see explicitly public features and sign-in/invitation pages", () => {
  for (const path of ["/", "/resume", "/upload", "/privacy"]) assert.equal(routeAllowed(path, null, []), false);
  assert.equal(routeAllowed("/resume", null, ["resume:view"]), true);
  assert.equal(routeAllowed("/upload", null, ["resume:view"]), false);
  assert.equal(routeAllowed("/admin", null, []), true);
  assert.equal(routeAllowed("/invite", null, []), true);
});

test("route access follows current permissions, including public grants", () => {
  const account = { isAdmin: false, permissions: [] };
  assert.equal(routeAllowed("/", account, []), true);
  assert.equal(routeAllowed("/upload", account, []), false);
  assert.equal(routeAllowed("/resume", account, []), false);
  assert.equal(routeAllowed("/resume", account, ["resume:view"]), true);
  for (const permission of ["files:upload", "files:view"]) {
    assert.equal(routeAllowed("/upload", { ...account, permissions: [permission] }, []), true);
    assert.equal(routeAllowed("/resume", { ...account, permissions: [permission] }, []), false);
  }
  for (const path of ["/resume", "/upload"]) assert.equal(routeAllowed(path, { isAdmin: true, permissions: [] }, []), true);
});
