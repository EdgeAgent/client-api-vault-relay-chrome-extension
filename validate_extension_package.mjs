import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "extension");
const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));
const popup = await readFile(resolve(root, "popup.html"), "utf8");
const requiredControls = ["providerTrigger", "providerMenu", "providerCommandSearch", "chatPanel", "vaultPanel", "catalogPanel", "bridgePanel", "bridgePairForm", "bridgeProject", "bridgeAccessSwitch", "bridgeSyncButton", "capturePageButton", "workspaceEntriesAction", "workspaceProviderAction", "workspaceLockAction"];

if (manifest.manifest_version !== 3) throw new Error("Extension must use Manifest V3.");
if (!/^\d+\.\d+\.\d+$/.test(manifest.version || "")) throw new Error("Manifest version must use a Chrome-compatible semantic version.");
if (!manifest.name || !manifest.short_name || !manifest.description) throw new Error("Manifest must include name, short name, and description.");
if (manifest.description.length > 132) throw new Error("Manifest description must not exceed 132 characters.");
if (!manifest.icons || !manifest.action?.default_icon) throw new Error("Manifest must define extension and action icons.");
if (manifest.background?.service_worker !== "background.js" || manifest.background?.type !== "module") throw new Error("Manifest must declare the module service worker.");
if (!manifest.permissions?.includes("storage") || !manifest.permissions?.includes("permissions") || !manifest.permissions?.includes("activeTab") || !manifest.permissions?.includes("scripting")) throw new Error("Manifest must declare storage, permissions, activeTab and scripting APIs.");
if (manifest.optional_host_permissions?.includes("<all_urls>")) throw new Error("The package must not request all URL schemes.");
if (!manifest.optional_host_permissions?.includes("https://*/*")) throw new Error("The package must declare optional HTTPS provider access for explicit, per-origin consent.");
if (!manifest.content_security_policy?.extension_pages?.includes("script-src 'self'")) throw new Error("Manifest CSP must limit extension scripts to the package.");
for (const size of [16, 32, 48, 128]) {
  const iconPath = manifest.icons[String(size)];
  if (!iconPath || iconPath !== manifest.action.default_icon[String(size)]) throw new Error(`Manifest icon mapping is incomplete for ${size}px.`);
  const bytes = await readFile(resolve(root, iconPath));
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== size || height !== size) throw new Error(`Icon ${iconPath} must be a ${size}x${size} PNG.`);
}
for (const id of requiredControls) {
  if (!popup.includes(`id="${id}"`)) throw new Error(`Popup is missing required control: ${id}.`);
}
for (const file of ["popup.js", "styles.css", "bridge.css", "background.js", "bridge.js", "content.js", "catalog.js", "permissions.js", "providers.js", "vault.js"]) await stat(resolve(root, file));
for (const file of ["background.js", "bridge.js", "content.js", "popup.js", "catalog.js", "permissions.js", "providers.js", "vault.js"]) {
  const source = await readFile(resolve(root, file), "utf8");
  if (/from\s+["']https?:\/\//.test(source) || /import\s*\(\s*["']https?:\/\//.test(source)) throw new Error(`${file} imports remotely hosted code.`);
}
console.log("Extension package validation passed: Manifest V3 metadata, package-local code, icons, and functional popup controls are present.");
