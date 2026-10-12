import { beforeEach, describe, expect, it, vi } from "vitest";
import { createVault, hasVault, removeVault, saveVault, unlockVault, VAULT_STORAGE_KEY } from "./vault.js";

const storage = {};

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key];
  globalThis.chrome = {
    storage: {
      local: {
        get: vi.fn(async key => ({ [key]: storage[key] })),
        set: vi.fn(async data => Object.assign(storage, data)),
        remove: vi.fn(async key => { delete storage[key]; }),
      },
    },
  };
});

describe("extension encrypted vault", () => {
  it("encrypts provider keys at rest and restores them only with the correct password", async () => {
    const password = "strong-development-password";
    await createVault(password);
    const entries = [{ id: "entry-1", providerId: "groq", apiKey: "gsk_super_secret_key", model: "llama", label: "Development" }];
    await saveVault(password, entries, undefined, "entry-1");

    const serializedEnvelope = JSON.stringify(storage[VAULT_STORAGE_KEY]);
    expect(serializedEnvelope).not.toContain("gsk_super_secret_key");
    expect(await unlockVault(password)).toMatchObject({ entries, activeEntryId: "entry-1" });
    await expect(unlockVault("incorrect-development-password")).rejects.toThrow(/incorrect/i);
  });

  it("rejects weak passwords and can delete the complete local vault", async () => {
    await expect(createVault("too-short")).rejects.toThrow(/12 characters/i);
    await createVault("valid-development-password");
    expect(await hasVault()).toBe(true);
    await removeVault();
    expect(await hasVault()).toBe(false);
  });
});
