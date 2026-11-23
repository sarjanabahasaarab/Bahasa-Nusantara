import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const shim = (name) => path.join(here, "shims", name + ".ts");

await build({
  absWorkingDir: root,
  entryPoints: ["native/android/runtime/runner.ts"],
  bundle: true,
  platform: "browser",
  format: "iife",
  target: ["es2020"],
  globalName: "NusantaraRuntime",
  outfile: "native/android/app/src/main/assets/nusantara-runtime.js",
  alias: {
    "node:fs": shim("fs"),
    "fs": shim("fs"),
    "node:path": shim("path"),
    "path": shim("path"),
    "node:crypto": shim("crypto"),
    "crypto": shim("crypto"),
    "node:http": shim("http"),
    "http": shim("http"),
    "node:https": shim("http"),
    "https": shim("http"),
    "node:child_process": shim("child_process"),
    "child_process": shim("child_process")
  },
  logLevel: "info"
});
console.log("Android interpreter bundle generated with browser-safe, fail-closed Node shims.");
