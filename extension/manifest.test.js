import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const manifestPath = fileURLToPath(new URL("./manifest.json", import.meta.url));

describe("Chrome extension manifest", () => {
  it("declares a store-ready Manifest V3 popup with package-local code", async () => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

    expect(manifest).toMatchObject({
      manifest_version: 3,
      name: "Autopilot Bridge — Vault Relay",
      short_name: "Autopilot Bridge",
      version: "1.1.1",
      minimum_chrome_version: "121",
      action: { default_popup: "popup.html" },
      background: { service_worker: "background.js", type: "module" },
    });
    expect(manifest.permissions).toEqual(["storage", "permissions", "activeTab", "scripting"]);
    expect(manifest.optional_host_permissions).toEqual(["https://*/*", "http://localhost/*", "http://127.0.0.1/*"]);
    expect(manifest.optional_host_permissions).not.toContain("<all_urls>");
    expect(manifest.content_security_policy.extension_pages).toContain("script-src 'self'");
  });
});
