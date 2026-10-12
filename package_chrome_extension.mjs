import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname);
const extensionRoot = resolve(projectRoot, "extension");
const manifest = JSON.parse(await readFile(resolve(extensionRoot, "manifest.json"), "utf8"));
const outputDirectory = resolve(process.env.CHROME_EXTENSION_DIST || "/home/ubuntu/Downloads");
const archiveName = `client-api-vault-relay-chrome-extension-${manifest.version}.zip`;
const archivePath = resolve(outputDirectory, archiveName);
const packageFiles = [
  "manifest.json",
  "popup.html",
  "popup.js",
  "styles.css",
  "background.js",
  "bridge.js",
  "bridge.css",
  "content.js",
  "catalog.js",
  "permissions.js",
  "providers.js",
  "vault.js",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png",
];

for (const file of packageFiles) await stat(resolve(extensionRoot, file));
await mkdir(outputDirectory, { recursive: true });
await rm(archivePath, { force: true });

const result = spawnSync("zip", ["-q", archivePath, ...packageFiles], { cwd: extensionRoot, encoding: "utf8" });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(result.stderr || "zip could not create the extension archive.");

console.log(`Chrome Web Store archive created: ${archivePath}`);
