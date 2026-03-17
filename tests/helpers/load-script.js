const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const defaultBtoa =
  typeof btoa === "function"
    ? btoa
    : (value) => Buffer.from(value, "binary").toString("base64");

const defaultAtob =
  typeof atob === "function"
    ? atob
    : (value) => Buffer.from(value, "base64").toString("binary");

function loadScript(relativePath, overrides = {}) {
  const scriptPath = path.resolve(__dirname, "..", "..", relativePath);
  const code = fs.readFileSync(scriptPath, "utf8");
  const context = vm.createContext({
    console,
    URLSearchParams,
    TextEncoder,
    setTimeout,
    clearTimeout,
    btoa: defaultBtoa,
    atob: defaultAtob,
    ...overrides,
  });

  vm.runInContext(code, context, { filename: scriptPath });
  return context;
}

module.exports = {
  loadScript,
};
