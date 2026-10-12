/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import { resolve } from "node:path";

const html = await readFile(resolve(process.cwd(), "extension/popup.html"), "utf8");
const storage = {};
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
async function waitUntil(assertion, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { assertion(); return; } catch { await settle(); }
  }
  assertion();
}

async function boot({ sendMessage } = {}) {
  document.documentElement.innerHTML = html;
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  globalThis.confirm = vi.fn(() => true);
  globalThis.chrome = {
    storage: {
      local: {
        get: vi.fn(async key => ({ [key]: storage[key] })),
        set: vi.fn(async data => Object.assign(storage, data)),
        remove: vi.fn(async key => { delete storage[key]; }),
      },
    },
    permissions: { contains: vi.fn(async () => true), request: vi.fn(async () => true) },
    runtime: { sendMessage: sendMessage ?? vi.fn(async () => ({ ok: true, text: "Provider reply" })) },
  };
  vi.resetModules();
  await import("./popup.js");
  await settle();
}

function submit(selector) {
  document.querySelector(selector).dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key];
  document.body.replaceChildren();
});

describe("premium extension popup", () => {
  it("opens real command controls, supports Escape and keyboard add-entry flow, and changes workspace surfaces", async () => {
    await boot();
    document.querySelector("#createPassword").value = "production-ready-password";
    document.querySelector("#confirmPassword").value = "production-ready-password";
    submit("#createVaultForm");
    expect(document.querySelector("#createVaultForm button").disabled).toBe(true);
    await waitUntil(() => expect(document.querySelector("#appView").hidden).toBe(false));

    document.querySelector("#providerTrigger").click();
    expect(document.querySelector("#providerMenu").hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.querySelector("#providerMenu").hidden).toBe(true);

    document.querySelector('[data-surface="catalog"]').click();
    expect(document.querySelector("#catalogPanel").hidden).toBe(false);
    expect(document.querySelector("#chatPanel").hidden).toBe(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "n", metaKey: true, bubbles: true }));
    expect(document.querySelector("#vaultPanel").hidden).toBe(false);
    expect(document.querySelector("#addEntryDetails").open).toBe(true);
  });

  it("encrypts a real entry, exposes it in the command menu, and restores it as active after lock and unlock", async () => {
    await boot();
    document.querySelector("#createPassword").value = "production-ready-password";
    document.querySelector("#confirmPassword").value = "production-ready-password";
    submit("#createVaultForm");
    await waitUntil(() => expect(document.querySelector("#appView").hidden).toBe(false));

    document.querySelector("#headerAddEntry").click();
    document.querySelector("#entryLabel").value = "Primary client key";
    document.querySelector("#entryKey").value = "private-client-provider-key";
    submit("#addEntryForm");
    expect(document.querySelector("#addEntryForm button").disabled).toBe(true);
    await waitUntil(() => expect(document.querySelector("#providerName").textContent).toBe("Primary client key"));

    document.querySelector("#workspaceProviderAction").click();
    expect(document.querySelector("#providerCommandList").textContent).toContain("Primary client key");
    document.querySelector("#workspaceLockAction").click();
    expect(document.querySelector("#unlockView").hidden).toBe(false);

    document.querySelector("#unlockPassword").value = "production-ready-password";
    submit("#unlockVaultForm");
    expect(document.querySelector("#unlockVaultForm button").disabled).toBe(true);
    await waitUntil(() => expect(document.querySelector("#providerName").textContent).toBe("Primary client key"));
  });

  it("shows and clears chat request loading state for both provider success and provider failure", async () => {
    let resolveProvider;
    const sendMessage = vi.fn(() => new Promise(resolve => { resolveProvider = resolve; }));
    await boot({ sendMessage });
    document.querySelector("#createPassword").value = "production-ready-password";
    document.querySelector("#confirmPassword").value = "production-ready-password";
    submit("#createVaultForm");
    await waitUntil(() => expect(document.querySelector("#appView").hidden).toBe(false));
    document.querySelector("#headerAddEntry").click();
    document.querySelector("#entryLabel").value = "Primary client key";
    document.querySelector("#entryKey").value = "private-client-provider-key";
    submit("#addEntryForm");
    await waitUntil(() => expect(document.querySelector("#providerName").textContent).toBe("Primary client key"));

    document.querySelector("#chatInput").value = "First private request";
    submit("#chatForm");
    const sendButton = document.querySelector("#chatForm button");
    await waitUntil(() => expect(sendButton.classList.contains("is-loading")).toBe(true));
    expect(sendButton.disabled).toBe(true);
    await waitUntil(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    resolveProvider({ ok: true, text: "Provider reply" });
    await waitUntil(() => expect(sendButton.disabled).toBe(false));
    expect(sendButton.classList.contains("is-loading")).toBe(false);

    sendMessage.mockRejectedValueOnce(new Error("Provider unavailable"));
    document.querySelector("#chatInput").value = "Second private request";
    submit("#chatForm");
    await waitUntil(() => expect(sendButton.classList.contains("is-loading")).toBe(true));
    await waitUntil(() => expect(sendButton.disabled).toBe(false));
    expect(document.querySelector("#status").textContent).toContain("Provider unavailable");
  });

  it("links the client profile to a project and pauses only this device's browser bridge", async () => {
    const sendMessage = vi.fn(async message => message.type === "AUTOPILOT_PAIR" ? {
      ok: true,
      pairing: { deviceToken: "device_token_123456789", workspaceName: "Agency workspace", agencyName: "EDGE | AGENCY", clientName: "Acme", projectName: "Website", role: "client", expiresAt: null },
    } : { ok: true, items: [] });
    await boot({ sendMessage });
    document.querySelector("#createPassword").value = "production-ready-password";
    document.querySelector("#confirmPassword").value = "production-ready-password";
    submit("#createVaultForm");
    await waitUntil(() => expect(document.querySelector("#appView").hidden).toBe(false));
    document.querySelector('[data-surface="bridge"]').click();
    document.querySelector("#bridgeBaseUrl").value = "https://agency.example";
    document.querySelector("#bridgePairCode").value = "one-use-project-code";
    submit("#bridgePairForm");
    await waitUntil(() => expect(document.querySelector("#bridgeProject").textContent).toBe("Acme · Website"));
    const accessSwitch = document.querySelector("#bridgeAccessSwitch");
    expect(accessSwitch.getAttribute("aria-checked")).toBe("true");
    expect(document.querySelector("#bridgeWorkspace").textContent).toBe("EDGE | AGENCY");
    accessSwitch.click();
    await waitUntil(() => expect(accessSwitch.getAttribute("aria-checked")).toBe("false"));
    expect(document.querySelector("#bridgeSyncButton").disabled).toBe(true);
    expect(document.querySelector("#status").textContent).toContain("server workflows can continue");
    expect(sendMessage.mock.calls.filter(([message]) => message.type === "AUTOPILOT_QUEUE")).toHaveLength(0);
    document.querySelector("#lockButton").click();
    document.querySelector("#unlockPassword").value = "production-ready-password";
    submit("#unlockVaultForm");
    await waitUntil(() => expect(document.querySelector("#appView").hidden).toBe(false));
    document.querySelector('[data-surface="bridge"]').click();
    expect(document.querySelector("#bridgeAccessSwitch").getAttribute("aria-checked")).toBe("false");
  });

});
