export function validateProviderBaseUrl(baseUrl) {
  const parsed = new URL(baseUrl);
  const localHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(localHost && parsed.protocol === "http:")) {
    throw new Error("Only HTTPS provider URLs are allowed, except local Ollama on localhost.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Provider URLs cannot contain credentials, query parameters, or fragments.");
  }
  return parsed.toString().replace(/\/$/, "");
}

function endpointWithPath(baseUrl, suffix) {
  const normalized = validateProviderBaseUrl(baseUrl);
  return normalized.endsWith(suffix) ? normalized : `${normalized}${suffix}`;
}

function requiredOrigin(url) {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.host}/*`;
}

async function ensureOriginPermission(url) {
  const origin = requiredOrigin(url);
  const allowed = await chrome.permissions.contains({ origins: [origin] });
  if (!allowed) throw new Error(`Permission to contact ${new URL(url).host} was not granted.`);
}

async function parseResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body?.error?.message || body?.message || `Provider returned HTTP ${response.status}.`;
    throw new Error(detail);
  }
  return body;
}

function openAIContent(body) {
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) return content.map(part => part?.text ?? "").join("").trim();
  throw new Error("The provider response did not contain a chat message.");
}

export async function sendCompletion({ provider, entry, messages, temperature = 0.5 }) {
  const adapter = entry.adapter || provider?.adapter;
  if (!provider || adapter === "manual") {
    throw new Error("This provider requires a custom adapter. Review its documentation before activating it.");
  }

  if (adapter === "openai") {
    const url = endpointWithPath(entry.baseUrl || provider.baseUrl, "/chat/completions");
    await ensureOriginPermission(url);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${entry.apiKey}`,
      },
      body: JSON.stringify({ model: entry.model, messages, temperature, stream: false }),
    });
    return openAIContent(await parseResponse(response));
  }

  if (adapter === "gemini") {
    const baseUrl = validateProviderBaseUrl(entry.baseUrl || provider.baseUrl);
    const model = String(entry.model || provider.defaultModel).replace(/^models\//, "");
    const url = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(entry.apiKey)}`;
    await ensureOriginPermission(url);
    const contents = messages
      .filter(message => message.role !== "system")
      .map(message => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] }));
    const system = messages.find(message => message.role === "system");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: system ? { parts: [{ text: system.content }] } : undefined,
        generationConfig: { temperature },
      }),
    });
    const body = await parseResponse(response);
    const text = body?.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join("").trim();
    if (!text) throw new Error("Gemini did not return text for this request.");
    return text;
  }

  if (adapter === "ollama") {
    const url = endpointWithPath(entry.baseUrl || provider.baseUrl, "/api/chat");
    await ensureOriginPermission(url);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: entry.model || provider.defaultModel, messages, stream: false, options: { temperature } }),
    });
    const body = await parseResponse(response);
    const text = body?.message?.content;
    if (!text) throw new Error("Local Ollama did not return a chat message. Check that the selected model is installed.");
    return text;
  }

  throw new Error("The selected provider adapter is not implemented.");
}
