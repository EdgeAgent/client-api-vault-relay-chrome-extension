import { describe, expect, it, vi } from "vitest";
import { endpointPermissionOrigin, requestEndpointPermission, revokeEndpointPermission } from "./permissions.js";

describe("optional provider permissions", () => {
  it("requests a precise provider origin and blocks the send flow when the user denies it", async () => {
    const chromeApi = { permissions: { contains: vi.fn(async () => false), request: vi.fn(async () => false) } };
    await expect(requestEndpointPermission(chromeApi, "https://api.client.example/v1")).rejects.toThrow(/not granted/i);
    expect(chromeApi.permissions.request).toHaveBeenCalledWith({ origins: ["https://api.client.example/*"] });
  });

  it("does not request permission again when the exact provider origin is already approved", async () => {
    const chromeApi = { permissions: { contains: vi.fn(async () => true), request: vi.fn() } };
    await expect(requestEndpointPermission(chromeApi, "http://127.0.0.1:11434")).resolves.toBe("http://127.0.0.1:11434/*");
    expect(chromeApi.permissions.request).not.toHaveBeenCalled();
  });

  it("normalizes and revokes an unused provider origin", async () => {
    const chromeApi = { permissions: { remove: vi.fn(async () => true) } };
    expect(endpointPermissionOrigin("https://api.client.example/v1/chat")).toBe("https://api.client.example/*");
    await expect(revokeEndpointPermission(chromeApi, "https://api.client.example/v1/chat")).resolves.toBe(true);
    expect(chromeApi.permissions.remove).toHaveBeenCalledWith({ origins: ["https://api.client.example/*"] });
  });
});
