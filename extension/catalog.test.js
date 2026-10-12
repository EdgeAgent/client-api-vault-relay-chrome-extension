import { describe, expect, it } from "vitest";
import { providerCatalog, sourceCatalogues } from "./catalog.js";

describe("three-source provider catalogue", () => {
  it("retains all three user-specified source catalogues", () => {
    expect(sourceCatalogues.map(source => source.id)).toEqual([
      "awesome-freellm-apis",
      "public-api-lists",
      "public-apis",
    ]);
  });

  it("includes key direct-chat adapters alongside discoverable manual listings", () => {
    expect(providerCatalog.length).toBeGreaterThanOrEqual(30);
    expect(providerCatalog.find(provider => provider.id === "groq")?.adapter).toBe("openai");
    expect(providerCatalog.find(provider => provider.id === "gemini")?.adapter).toBe("gemini");
    expect(providerCatalog.find(provider => provider.id === "ollama-local")?.adapter).toBe("ollama");
    expect(providerCatalog.find(provider => provider.id === "cloudflare-workers-ai")?.adapter).toBe("manual");
  });

  it("exposes source-attributed endpoint and request-route data for user inspection", () => {
    const groq = providerCatalog.find(provider => provider.id === "groq");
    const gemini = providerCatalog.find(provider => provider.id === "gemini");
    const cloudflare = providerCatalog.find(provider => provider.id === "cloudflare-workers-ai");

    expect(groq).toMatchObject({
      baseUrl: "https://api.groq.com/openai/v1",
      requestRoute: "https://api.groq.com/openai/v1/chat/completions",
      canAddToVault: true,
    });
    expect(gemini?.requestRoute).toContain("models/{model}:generateContent?key={api_key}");
    expect(cloudflare).toMatchObject({ canAddToVault: false });
  });
});
