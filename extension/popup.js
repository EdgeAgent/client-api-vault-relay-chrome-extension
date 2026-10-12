import { getProvider, providerCatalog, sourceCatalogues } from "./catalog.js";
import { endpointPermissionOrigin, requestEndpointPermission, revokeEndpointPermission } from "./permissions.js";
import { validateProviderBaseUrl } from "./providers.js";
import { createVault, hasVault, maskKey, removeVault, saveVault, unlockVault } from "./vault.js";
import { validateBridgeBaseUrl } from "./bridge.js";

const state = { password: null, entries: [], activeEntryId: null, createdAt: null, bridge: null, messages: [], surface: "chat", bridgeBusy: false };
const $ = selector => document.querySelector(selector);

const surfaceCopy = {
  chat: { kicker: "PRIVATE CHAT", title: "Ask with intent." },
  vault: { kicker: "LOCAL VAULT", title: "Own the access." },
  catalog: { kicker: "OPEN INDEX", title: "Find the right route." },
  bridge: { kicker: "APP GATEWAY", title: "Move work safely." },
};

function setStatus(message = "", ok = false) {
  const status = $("#status");
  status.textContent = message;
  status.classList.toggle("ok", ok);
}

function setFormLoading(form, loading, label) {
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;
  const text = button.querySelector("span");
  if (!button.dataset.defaultLabel) button.dataset.defaultLabel = text?.textContent || button.textContent;
  button.disabled = loading;
  button.classList.toggle("is-loading", loading);
  form.setAttribute("aria-busy", String(loading));
  if (text) text.textContent = loading ? label : button.dataset.defaultLabel;
}

function createTextElement(tag, text, className) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function entryProvider(entry) {
  if (!entry) return null;
  return entry.providerId === "__custom__"
    ? { id: "custom", name: "Custom endpoint", adapter: entry.adapter, baseUrl: entry.baseUrl, defaultModel: entry.model }
    : getProvider(entry.providerId);
}

function entryLabel(entry) {
  const provider = entryProvider(entry);
  return entry?.providerId === "__custom__" ? `Custom ${entry.adapter} endpoint` : provider?.name ?? entry?.providerId ?? "No provider";
}

function activeEntry() {
  return state.entries.find(entry => entry.id === state.activeEntryId) ?? state.entries[0] ?? null;
}

function setView(view) {
  $("#setupView").hidden = view !== "setup";
  $("#unlockView").hidden = view !== "unlock";
  $("#appView").hidden = view !== "app";
  setStatus("");
}

function lockVault(message = "Vault locked. Your session password was cleared.") {
  state.password = null;
  state.entries = [];
  state.activeEntryId = null;
  state.createdAt = null;
  state.bridge = null;
  state.messages = [];
  closeProviderMenu();
  setView("unlock");
  setStatus(message, true);
}

async function persistEntries() {
  const active = activeEntry();
  state.activeEntryId = active?.id ?? null;
  await saveVault(state.password, state.entries, state.createdAt, state.activeEntryId, state.bridge);
}

function updateActiveProvider() {
  const entry = activeEntry();
  const provider = entryProvider(entry);
  $("#providerName").textContent = entry ? entry.label : "No provider selected";
  $("#providerMeta").textContent = entry ? `${entryLabel(entry)} · ${entry.model}` : "Add an encrypted entry to start";
  $("#workspaceProviderStatus").textContent = provider?.name ?? "—";
  $("#workspaceEntryCount").textContent = String(state.entries.length);
  $("#workspaceStatus").textContent = entry ? "Vault unlocked" : "Vault ready for setup";
}

function renderMessages() {
  const container = $("#chatMessages");
  container.replaceChildren();
  $("#messageCount").textContent = `${state.messages.length} MESSAGE${state.messages.length === 1 ? "" : "S"}`;
  if (!state.messages.length) {
    const empty = document.createElement("div");
    empty.className = "empty-thread";
    empty.append(createTextElement("strong", activeEntry() ? "A clean private thread." : "Your secure workspace is ready."));
    empty.append(createTextElement("p", activeEntry() ? "Your prompt is sent only when you explicitly grant this provider origin permission." : "Add an encrypted provider entry, then choose it from the command selector above."));
    container.append(empty);
    return;
  }
  for (const message of state.messages) {
    const item = document.createElement("article");
    item.className = `message ${message.role}`;
    item.append(createTextElement("span", message.role === "user" ? "YOU" : "PROVIDER", "role"));
    item.append(createTextElement("span", message.content));
    container.append(item);
  }
  container.scrollTop = container.scrollHeight;
}

async function setActiveEntry(id, announcement = "Active provider updated.") {
  if (!state.entries.some(entry => entry.id === id)) return;
  state.activeEntryId = id;
  await persistEntries();
  updateActiveProvider();
  renderEntries();
  renderProviderCommand($("#providerCommandSearch").value);
  closeProviderMenu();
  setStatus(announcement, true);
}

function renderEntries() {
  const list = $("#vaultEntries");
  list.replaceChildren();
  if (!state.entries.length) {
    list.append(createTextElement("p", "No encrypted provider entries yet. Add one below to create a client-controlled connection.", "surface-description"));
    return;
  }
  for (const entry of state.entries) {
    const item = document.createElement("article");
    item.className = "entry";
    const copy = document.createElement("div");
    copy.append(createTextElement("strong", entry.label));
    copy.append(createTextElement("p", `${entryLabel(entry)} · ${maskKey(entry.apiKey || "local")}`));
    const actions = document.createElement("div");
    actions.className = "entry-actions";
    if (entry.id !== state.activeEntryId) {
      const choose = createTextElement("button", "Use", "entry-select");
      choose.type = "button";
      choose.addEventListener("click", () => setActiveEntry(entry.id));
      actions.append(choose);
    } else {
      actions.append(createTextElement("span", "ACTIVE", "thread-count"));
    }
    const remove = createTextElement("button", "Remove", "remove");
    remove.type = "button";
    remove.addEventListener("click", async () => {
      if (!confirm(`Remove ${entry.label}? This deletes its encrypted entry from this Chrome profile.`)) return;
      const retainedEntries = state.entries.filter(item => item.id !== entry.id);
      await revokeUnusedEntryPermission(entry, retainedEntries).catch(() => undefined);
      state.entries = retainedEntries;
      await persistEntries();
      updateActiveProvider();
      renderEntries();
      renderProviderCommand($("#providerCommandSearch").value);
      renderMessages();
      setStatus("Encrypted provider entry removed.", true);
    });
    actions.append(remove);
    item.append(copy, actions);
    list.append(item);
  }
}

function renderProviderCommand(filter = "") {
  const query = filter.trim().toLowerCase();
  const matches = state.entries.filter(entry => `${entry.label} ${entryLabel(entry)} ${entry.model}`.toLowerCase().includes(query));
  const list = $("#providerCommandList");
  list.replaceChildren();
  if (!matches.length) {
    list.append(createTextElement("p", state.entries.length ? "No encrypted entries match this search." : "No encrypted provider entries yet.", "menu-empty"));
    return;
  }
  for (const entry of matches) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = `command-option${entry.id === state.activeEntryId ? " active" : ""}`;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(entry.id === state.activeEntryId));
    option.append(createTextElement("span", "↯", "option-mark"));
    const copy = document.createElement("span");
    copy.className = "option-copy";
    copy.append(createTextElement("strong", entry.label));
    copy.append(createTextElement("small", `${entryLabel(entry)} · ${entry.model}`));
    option.append(copy);
    if (entry.id === state.activeEntryId) option.append(createTextElement("span", "✓", "check"));
    option.addEventListener("click", () => setActiveEntry(entry.id));
    list.append(option);
  }
}

function renderSourceCatalogues() {
  const container = $("#sourceCatalogues");
  container.replaceChildren();
  for (const source of sourceCatalogues) {
    const item = document.createElement("article");
    item.className = "source";
    const text = document.createElement("div");
    text.append(createTextElement("strong", source.name));
    text.append(createTextElement("p", source.purpose));
    const link = createTextElement("a", "Source ↗");
    link.href = source.sourceUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    const dataLink = createTextElement("a", "Browse catalog ↗");
    dataLink.href = source.dataUrl;
    dataLink.target = "_blank";
    dataLink.rel = "noreferrer";
    const links = document.createElement("div");
    links.className = "source-links";
    links.append(link, dataLink);
    item.append(text, links);
    container.append(item);
  }
}

function addCatalogProviderToVault(providerId) {
  const provider = getProvider(providerId);
  if (!provider?.canAddToVault) return;
  $("#providerPreset").value = provider.id;
  applyPreset();
  openAddEntry();
  setStatus(`${provider.name} endpoint loaded. Add your own provider credential to save it.`, true);
}

function renderProviderCatalog(filter = "") {
  const query = filter.trim().toLowerCase();
  const providers = providerCatalog.filter(provider => `${provider.name} ${provider.id} ${provider.adapter}`.toLowerCase().includes(query));
  $("#providerCount").textContent = `${providers.length} PRESETS`;
  const container = $("#providerCatalog");
  container.replaceChildren();
  for (const provider of providers) {
    const item = document.createElement("article");
    item.className = "provider-card endpoint-card";
    item.append(createTextElement("span", provider.accessLabel, "badge"));
    item.append(createTextElement("strong", provider.name));
    item.append(createTextElement("p", `${provider.adapter === "openai" ? "OpenAI-compatible" : provider.adapter} · Default: ${provider.defaultModel}`));
    const baseUrl = createTextElement("code", provider.baseUrl || "No fixed base URL in the source listing", "endpoint-url");
    const route = createTextElement("code", provider.requestRoute, "endpoint-route");
    const endpointDetails = document.createElement("div");
    endpointDetails.className = "endpoint-details";
    endpointDetails.append(createTextElement("span", "BASE URL", "endpoint-label"), baseUrl, createTextElement("span", "REQUEST ROUTE", "endpoint-label"), route);
    item.append(endpointDetails);
    const actions = document.createElement("div");
    actions.className = "endpoint-actions";
    const link = createTextElement("a", "Get provider key ↗");
    link.href = provider.keyUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    actions.append(link);
    if (provider.canAddToVault) {
      const add = createTextElement("button", "Use this endpoint", "endpoint-add");
      add.type = "button";
      add.addEventListener("click", () => addCatalogProviderToVault(provider.id));
      actions.append(add);
    } else {
      actions.append(createTextElement("span", "Manual adapter review required", "endpoint-manual"));
    }
    item.append(actions);
    container.append(item);
  }
}

function populatePresetSelect() {
  const select = $("#providerPreset");
  select.replaceChildren();
  for (const provider of providerCatalog) select.append(new Option(provider.name, provider.id));
  select.append(new Option("Custom endpoint (advanced)", "__custom__"));
  applyPreset();
}

function applyPreset() {
  const provider = getProvider($("#providerPreset").value);
  const isCustom = $("#providerPreset").value === "__custom__";
  $("#customAdapterField").hidden = !isCustom;
  const adapter = isCustom ? $("#customAdapter").value : provider?.adapter;
  if (isCustom) {
    $("#entryModel").value = "";
    $("#entryBaseUrl").value = "";
    $("#entryHelp").textContent = "Advanced route: use a documented HTTPS base URL and adapter. You approve this exact provider origin before any request runs.";
  } else if (provider) {
    $("#entryModel").value = provider.defaultModel;
    $("#entryBaseUrl").value = provider.baseUrl;
    $("#entryHelp").textContent = provider.adapter === "manual" ? "Discovery listing only: add a custom adapter before using it for chat." : `${provider.accessLabel}. Source: ${provider.source}.`;
  }
  $("#entryKey").required = adapter !== "ollama";
  $("#entryKey").disabled = adapter === "ollama";
  $("#entryKey").placeholder = adapter === "ollama" ? "No key required for local Ollama" : "Paste client-controlled API key";
}

function switchSurface(surface) {
  state.surface = surface;
  for (const button of document.querySelectorAll(".rail-button[data-surface]")) button.classList.toggle("active", button.dataset.surface === surface);
  $("#chatPanel").hidden = surface !== "chat";
  $("#vaultPanel").hidden = surface !== "vault";
  $("#catalogPanel").hidden = surface !== "catalog";
  $("#bridgePanel").hidden = surface !== "bridge";
  $("#surfaceKicker").textContent = surfaceCopy[surface].kicker;
  $("#surfaceTitle").textContent = surfaceCopy[surface].title;
  closeProviderMenu();
}

function openProviderMenu() {
  const menu = $("#providerMenu");
  menu.hidden = false;
  $("#providerTrigger").setAttribute("aria-expanded", "true");
  renderProviderCommand($("#providerCommandSearch").value);
  setTimeout(() => $("#providerCommandSearch").focus(), 0);
}

function closeProviderMenu() {
  $("#providerMenu").hidden = true;
  $("#providerTrigger").setAttribute("aria-expanded", "false");
}

function openAddEntry() {
  switchSurface("vault");
  $("#addEntryDetails").open = true;
  setTimeout(() => $("#entryLabel").focus(), 0);
}

async function requestEntryPermission(entry) {
  return requestEndpointPermission(chrome, entry.baseUrl);
}

async function revokeUnusedEntryPermission(entry, retainedEntries) {
  const entryOrigin = endpointPermissionOrigin(entry.baseUrl);
  const stillInUse = retainedEntries.some(candidate => endpointPermissionOrigin(candidate.baseUrl) === entryOrigin);
  if (!stillInUse) await revokeEndpointPermission(chrome, entry.baseUrl);
}

function renderWorkspace() {
  updateActiveProvider();
  renderEntries();
  renderProviderCommand();
  renderMessages();
  renderBridge();
}

function renderBridge() {
  const paired = Boolean(state.bridge?.deviceToken);
  $("#bridgePairForm").hidden = paired;
  $("#bridgeConnected").hidden = !paired;
  $("#bridgeBadge").textContent = paired ? "PAIRED · LOCAL TOKEN" : "NOT PAIRED";
  if (paired) {
    $("#bridgeBaseUrl").value = state.bridge.baseUrl;
    $("#bridgeWorkspace").textContent = state.bridge.workspaceName;
    $("#bridgeRole").textContent = String(state.bridge.role).replaceAll("_", " ").toUpperCase();
  }
}

async function approvedOrigin(baseUrl) {
  const origin = validateBridgeBaseUrl(baseUrl);
  const permission = `${origin}/*`;
  if (!(await chrome.permissions.contains({ origins: [permission] }))) {
    const granted = await chrome.permissions.request({ origins: [permission] });
    if (!granted) throw new Error(`Permission to contact ${new URL(origin).host} was not granted.`);
  }
  return origin;
}

$("#bridgePairForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!state.password) return setStatus("Unlock the encrypted vault before pairing this device.");
  const form = event.currentTarget;
  setFormLoading(form, true, "Pairing device…");
  try {
    const baseUrl = await approvedOrigin($("#bridgeBaseUrl").value);
    const result = await chrome.runtime.sendMessage({
      type: "AUTOPILOT_PAIR",
      payload: { baseUrl, code: $("#bridgePairCode").value.trim(), deviceName: "Chrome · " + navigator.platform },
    });
    if (!result?.ok) throw new Error(result?.error || "Pairing failed.");
    state.bridge = { baseUrl, ...result.pairing, connectedAt: new Date().toISOString() };
    await persistEntries();
    $("#bridgePairCode").value = "";
    renderBridge();
    setStatus(`Paired to ${state.bridge.workspaceName}. App token sealed in your local vault.`, true);
  } catch (error) { setStatus(error instanceof Error ? error.message : "Pairing failed."); }
  finally { setFormLoading(form, false); }
});

$("#bridgeSyncButton").addEventListener("click", async () => {
  if (!state.bridge?.deviceToken) return;
  state.bridgeBusy = true;
  $("#bridgeQueue").textContent = "Loading assigned work… Press Escape or Alt+S to interrupt.";
  try {
    const result = await chrome.runtime.sendMessage({ type: "AUTOPILOT_QUEUE", payload: { baseUrl: state.bridge.baseUrl, token: state.bridge.deviceToken } });
    if (!result?.ok) throw new Error(result?.error || "Queue request failed.");
    const items = result.items.map(item => ({ id: item.id, title: item.title, state: item.state, action: item.action, owner: item.owner, requiresApproval: item.requiresApproval }));
    $("#bridgeQueue").textContent = items.length ? JSON.stringify(items, null, 2) : "No assigned work is waiting. The app remains the source of truth.";
    setStatus(`Synced ${items.length} authorized item${items.length === 1 ? "" : "s"}. No page action was executed.`, true);
  } catch (error) { $("#bridgeQueue").textContent = error instanceof Error ? error.message : "Queue request failed."; }
  finally { state.bridgeBusy = false; }
});

$("#bridgeDisconnectButton").addEventListener("click", async () => {
  if (!state.bridge || !confirm(`Disconnect ${state.bridge.workspaceName}? The app will revoke this device token.`)) return;
  try {
    const result = await chrome.runtime.sendMessage({ type: "AUTOPILOT_DISCONNECT", payload: { baseUrl: state.bridge.baseUrl, token: state.bridge.deviceToken } });
    if (!result?.ok) throw new Error(result?.error || "The app could not revoke this device.");
    state.bridge = null; await persistEntries(); renderBridge(); setStatus("Workspace disconnected and device revoked.", true);
  } catch (error) { setStatus(error instanceof Error ? error.message : "Disconnect failed. Token remains stored."); }
});

$("#capturePageButton").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) return setStatus("No active browser tab is available.");
  $("#captureMeta").textContent = "Indexing visible semantic structure…";
  try {
    const result = await chrome.runtime.sendMessage({ type: "AUTOPILOT_CAPTURE_PAGE", payload: { tabId: tab.id } });
    if (!result?.ok) throw new Error(result?.error || "Page capture failed.");
    const page = result.page;
    $("#captureMeta").textContent = `${page.host}${page.path} · ${page.controls.length} controls · no form values`;
    $("#bridgeQueue").textContent = JSON.stringify({ title: page.title, headings: page.headings, controls: page.controls.slice(0, 18), summary: page.summary, note: page.note }, null, 2);
    setStatus("Safe page structure indexed locally. Nothing was executed or sent to the app.", true);
  } catch (error) { $("#captureMeta").textContent = "Not captured"; setStatus(error instanceof Error ? error.message : "Page capture failed."); }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" || (event.altKey && event.key.toLowerCase() === "s")) {
    if (state.bridgeBusy) {
      state.bridgeBusy = false;
      chrome.runtime.sendMessage({ type: "AUTOPILOT_ABORT" }).catch(() => undefined);
      $("#bridgeQueue").textContent = "Interrupted by user. No page action was executed.";
      setStatus("Gateway request interrupted.", true);
    }
  }
});

async function initialize() {
  populatePresetSelect();
  renderSourceCatalogues();
  renderProviderCatalog();
  setView((await hasVault()) ? "unlock" : "setup");
}

$("#createVaultForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const password = $("#createPassword").value;
  if (password !== $("#confirmPassword").value) return setStatus("The two vault passwords do not match.");
  setFormLoading(form, true, "Sealing vault…");
  try {
    const payload = await createVault(password);
    state.password = password; state.entries = payload.entries; state.activeEntryId = payload.activeEntryId; state.createdAt = payload.createdAt; state.bridge = payload.bridge ?? null;
    setView("app"); renderWorkspace(); switchSurface("chat");
    setStatus("Encrypted vault created on this device.", true);
  } catch (error) { setStatus(error.message); } finally { setFormLoading(form, false); }
});

$("#unlockVaultForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  setFormLoading(form, true, "Unlocking vault…");
  try {
    const payload = await unlockVault($("#unlockPassword").value);
    state.password = $("#unlockPassword").value; state.entries = payload.entries; state.activeEntryId = payload.activeEntryId ?? payload.entries[0]?.id ?? null; state.createdAt = payload.createdAt; state.bridge = payload.bridge ?? null;
    setView("app"); renderWorkspace(); switchSurface("chat");
    setStatus("Vault unlocked locally.", true);
  } catch (error) { setStatus(error.message); } finally { setFormLoading(form, false); }
});

$("#lockButton").addEventListener("click", () => lockVault());
$("#headerAddEntry").addEventListener("click", openAddEntry);
$("#providerMenuAdd").addEventListener("click", openAddEntry);
$("#workspaceEntriesAction").addEventListener("click", () => switchSurface("vault"));
$("#workspaceProviderAction").addEventListener("click", openProviderMenu);
$("#workspaceLockAction").addEventListener("click", () => lockVault());
for (const button of document.querySelectorAll(".rail-button[data-surface]")) button.addEventListener("click", () => switchSurface(button.dataset.surface));
$("#providerTrigger").addEventListener("click", () => $("#providerMenu").hidden ? openProviderMenu() : closeProviderMenu());
$("#providerCommandSearch").addEventListener("input", event => renderProviderCommand(event.target.value));
$("#providerPreset").addEventListener("change", applyPreset);
$("#customAdapter").addEventListener("change", applyPreset);
$("#providerSearch").addEventListener("input", event => renderProviderCatalog(event.target.value));

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !$("#providerMenu").hidden) { closeProviderMenu(); $("#providerTrigger").focus(); }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") { event.preventDefault(); openAddEntry(); }
});

$("#chatInput").addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); $("#chatForm").requestSubmit(); }
});

$("#addEntryForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const isCustom = $("#providerPreset").value === "__custom__";
  const provider = getProvider($("#providerPreset").value);
  const adapter = isCustom ? $("#customAdapter").value : provider?.adapter;
  const apiKey = $("#entryKey").value.trim();
  if (!adapter) return setStatus("Select a valid provider or custom adapter.");
  if (adapter !== "ollama" && !apiKey) return setStatus("An API key is required for this provider.");
  let baseUrl;
  try { baseUrl = validateProviderBaseUrl($("#entryBaseUrl").value.trim()); } catch (error) { return setStatus(error.message); }
  const entry = { id: crypto.randomUUID(), providerId: isCustom ? "__custom__" : provider.id, adapter: isCustom ? adapter : undefined, label: $("#entryLabel").value.trim(), model: $("#entryModel").value.trim(), apiKey, baseUrl, createdAt: new Date().toISOString() };
  setFormLoading(form, true, "Encrypting entry…");
  try {
    state.entries = [...state.entries, entry]; state.activeEntryId = entry.id;
    await persistEntries(); event.target.reset(); applyPreset(); $("#addEntryDetails").open = false;
    renderWorkspace(); switchSurface("chat"); setStatus("Provider entry encrypted and activated locally.", true);
  } catch (error) { setStatus(error.message); } finally { setFormLoading(form, false); }
});

$("#deleteVault").addEventListener("click", async () => {
  if (!confirm("Delete this encrypted vault and all local provider entries? This cannot be undone.")) return;
  await Promise.allSettled(state.entries.map(entry => revokeEndpointPermission(chrome, entry.baseUrl)));
  await removeVault(); state.password = null; state.entries = []; state.activeEntryId = null; state.createdAt = null; state.bridge = null; state.messages = [];
  setView("setup"); setStatus("Encrypted vault deleted from this Chrome profile.", true);
});

$("#chatForm").addEventListener("submit", async event => {
  event.preventDefault();
  const entry = activeEntry();
  if (!entry) { setStatus("Add an encrypted provider entry first."); return openAddEntry(); }
  const prompt = $("#chatInput").value.trim();
  if (!prompt) return;
  const provider = entryProvider(entry);
  if (provider?.adapter === "manual") return setStatus("This provider needs a documented custom adapter before it can run chat.");
  state.messages = [...state.messages, { role: "user", content: prompt }]; $("#chatInput").value = ""; renderMessages();
  const submit = event.submitter ?? event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true; submit.classList.add("is-loading"); setStatus("Requesting the selected provider…", true);
  try {
    await requestEntryPermission(entry);
    const result = await chrome.runtime.sendMessage({ type: "CLIENT_VAULT_CHAT", payload: { provider, entry, messages: state.messages } });
    if (!result?.ok) throw new Error(result?.error || "Provider request failed.");
    state.messages = [...state.messages, { role: "assistant", content: result.text }]; renderMessages();
    setStatus("Response received. Credentials were not stored in chat history.", true);
  } catch (error) { setStatus(error.message); } finally { submit.disabled = false; submit.classList.remove("is-loading"); }
});

initialize().catch(error => setStatus(error.message));
