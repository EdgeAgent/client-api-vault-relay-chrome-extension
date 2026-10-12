import { sendCompletion } from "./providers.js";
import { validateBridgeBaseUrl, validatePairingResult } from "./bridge.js";
const activeControllers = new Set();

async function apiRequest(baseUrl, path, { token, method = "GET", body, signal } = {}) {
  const origin = validateBridgeBaseUrl(baseUrl);
  const url = new URL(path, `${origin}/`);
  if (url.origin !== origin) throw new Error("Bridge request attempted to leave the approved app origin.");
  const permission = `${origin}/*`;
  if (!(await chrome.permissions.contains({ origins: [permission] }))) {
    throw new Error(`App origin permission is missing for ${new URL(origin).host}.`);
  }
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url.href, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "omit", cache: "no-store", redirect: "error", signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(data?.error || `Autopilot app returned HTTP ${response.status}.`).slice(0, 220));
  return data;
}

function extensionPage(sender) {
  return typeof sender.url === "string" && sender.url.startsWith(`chrome-extension://${chrome.runtime.id}/`);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!extensionPage(sender)) return undefined;
  if (message?.type === "CLIENT_VAULT_CHAT") {
    sendCompletion(message.payload)
      .then(text => sendResponse({ ok: true, text }))
      .catch(error => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Request failed." }));
    return true;
  }
  if (message?.type === "AUTOPILOT_PAIR") {
    const { baseUrl, code, deviceName } = message.payload || {};
    apiRequest(baseUrl, "/api/extension/pair", {
      method: "POST", body: { code: String(code || "").trim(), device: { name: String(deviceName || "Chrome extension").slice(0, 80), version: chrome.runtime.getManifest().version } },
    }).then(data => sendResponse({ ok: true, pairing: validatePairingResult(data) }))
      .catch(error => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Pairing failed." }));
    return true;
  }
  if (message?.type === "AUTOPILOT_QUEUE") {
    const { baseUrl, token } = message.payload || {};
    const controller = new AbortController(); activeControllers.add(controller);
    apiRequest(baseUrl, "/api/extension/queue", { token, signal: controller.signal })
      .then(data => sendResponse({ ok: true, items: Array.isArray(data.items) ? data.items.slice(0, 25) : [] }))
      .catch(error => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Queue request failed." }))
      .finally(() => activeControllers.delete(controller));
    return true;
  }
  if (message?.type === "AUTOPILOT_ABORT") {
    for (const controller of activeControllers) controller.abort();
    activeControllers.clear();
    sendResponse({ ok: true });
    return false;
  }
  if (message?.type === "AUTOPILOT_EVENT") {
    const { baseUrl, token, event } = message.payload || {};
    apiRequest(baseUrl, "/api/extension/events", {
      token, method: "POST", body: { event: String(event?.event || "").slice(0, 48), runId: String(event?.runId || "").slice(0, 100), summary: String(event?.summary || "").slice(0, 800), idempotencyKey: String(event?.idempotencyKey || crypto.randomUUID()) },
    }).then(data => sendResponse({ ok: true, data }))
      .catch(error => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Event delivery failed." }));
    return true;
  }
  if (message?.type === "AUTOPILOT_DISCONNECT") {
    const { baseUrl, token } = message.payload || {};
    apiRequest(baseUrl, "/api/extension/disconnect", { token, method: "POST", body: {} })
      .then(() => sendResponse({ ok: true }))
      .catch(error => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Disconnect failed." }));
    return true;
  }
  if (message?.type === "AUTOPILOT_CAPTURE_PAGE") {
    const tabId = Number(message.payload?.tabId);
    if (!Number.isInteger(tabId)) { sendResponse({ ok: false, error: "No active tab was selected." }); return false; }
    chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] })
      .then(() => chrome.tabs.sendMessage(tabId, { type: "AUTOPILOT_CAPTURE_PAGE" }))
      .then(result => sendResponse(result?.ok ? { ok: true, page: result.page } : { ok: false, error: result?.error || "Could not index this page." }))
      .catch(() => sendResponse({ ok: false, error: "This tab does not allow extension capture. Choose a regular web page and retry." }));
    return true;
  }
  return undefined;
});
