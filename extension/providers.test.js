import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendCompletion, validateProviderBaseUrl } from "./providers.js";

beforeEach(() => {
  globalThis.chrome = { permissions: { contains: vi.fn(async () => true) } };
  globalThis.fetch = vi.fn();
});

describe("provider adapters", () => {
  it("sends an OpenAI-compatible request with the selected entry model", async () => {
    fetch.mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "Ready" } }] }), { status: 200 }));
    const text = await sendCompletion({
      provider: { adapter: "openai", baseUrl: "https://api.groq.com/openai/v1" },
      entry: { baseUrl: "https://api.groq.com/openai/v1", apiKey: "key", model: "llama-3.3-70b-versatile" },
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(text).toBe("Ready");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer key" }),
        body: expect.stringContaining("llama-3.3-70b-versatile"),
      }),
    );
  });

  it("returns a safe provider error without revealing request headers", async () => {
    fetch.mockResolvedValue(new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 }));
    await expect(sendCompletion({
      provider: { adapter: "openai", baseUrl: "https://api.groq.com/openai/v1" },
      entry: { baseUrl: "https://api.groq.com/openai/v1", apiKey: "key", model: "llama" },
      messages: [{ role: "user", content: "Hello" }],
    })).rejects.toThrow("Invalid API key");
  });

  it("permits an explicit HTTPS custom endpoint but rejects unsafe endpoint forms", async () => {
    expect(validateProviderBaseUrl("https://api.client.example/v1/")).toBe("https://api.client.example/v1");
    expect(validateProviderBaseUrl("http://127.0.0.1:11434")).toBe("http://127.0.0.1:11434");
    expect(() => validateProviderBaseUrl("http://api.client.example/v1")).toThrow(/HTTPS/i);
    expect(() => validateProviderBaseUrl("https://user:pass@api.client.example/v1")).toThrow(/credentials/i);
  });

  it("blocks a credentialed request when the provider origin was not approved", async () => {
    chrome.permissions.contains.mockResolvedValue(false);
    await expect(sendCompletion({
      provider: { adapter: "openai", baseUrl: "https://api.client.example/v1" },
      entry: { adapter: "openai", baseUrl: "https://api.client.example/v1", apiKey: "client-key", model: "client-model" },
      messages: [{ role: "user", content: "Hello" }],
    })).rejects.toThrow(/not granted/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("dispatches a saved custom OpenAI-compatible entry using its explicit base URL", async () => {
    fetch.mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "Custom provider response" } }] }), { status: 200 }));
    const text = await sendCompletion({
      provider: { id: "custom", adapter: "manual" },
      entry: { adapter: "openai", baseUrl: "https://models.client.example/v1", apiKey: "client-key", model: "client-model" },
      messages: [{ role: "user", content: "Hello" }],
    });
    expect(text).toBe("Custom provider response");
    expect(fetch).toHaveBeenCalledWith("https://models.client.example/v1/chat/completions", expect.any(Object));
  });
});
