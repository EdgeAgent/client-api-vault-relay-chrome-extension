import { describe, expect, it } from "vitest";
import { validateBridgeBaseUrl, validatePairingResult } from "./bridge.js";

describe("Autopilot bridge contract", () => {
  it("permits HTTPS and explicit loopback HTTP only", () => {
    expect(validateBridgeBaseUrl("https://agency.example/app")).toBe("https://agency.example");
    expect(validateBridgeBaseUrl("http://localhost:3000")).toBe("http://localhost:3000");
    expect(() => validateBridgeBaseUrl("http://agency.example")).toThrow(/HTTPS/);
    expect(() => validateBridgeBaseUrl("https://user:pass@agency.example")).toThrow(/credentials/);
    expect(() => validateBridgeBaseUrl("https://agency.example/?token=x")).toThrow(/query/);
  });
  it("requires an opaque token, workspace label and recognized role", () => {
    expect(validatePairingResult({ deviceToken: "token_x1234567890", workspaceName: "Acme Workspace", role: "viewer" })).toEqual({
      deviceToken: "token_x1234567890", workspaceName: "Acme Workspace", role: "viewer", expiresAt: null,
    });
    expect(() => validatePairingResult({ deviceToken: "short", workspaceName: "Acme" })).toThrow(/invalid/);
  });
});
