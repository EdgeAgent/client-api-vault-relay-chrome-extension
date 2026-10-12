export function validateBridgeBaseUrl(value) {
  let parsed;
  try { parsed = new URL(String(value || "").trim()); } catch { throw new Error("Enter the Autopilot app URL."); }
  const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) {
    throw new Error("The app gateway must use HTTPS, except for explicit localhost development.");
  }
  if (parsed.username || parsed.password) throw new Error("App URLs cannot contain credentials.");
  if (parsed.search || parsed.hash) throw new Error("App URLs cannot contain query parameters or fragments.");
  return parsed.origin;
}

export function validatePairingResult(result) {
  if (!result || typeof result.deviceToken !== "string" || result.deviceToken.length < 16 ||
      typeof result.workspaceName !== "string" || !result.workspaceName.trim() ||
      !["agency_owner", "agency_staff", "viewer", "client"].includes(result.role)) {
    throw new Error("The app returned an invalid pairing response. Confirm its bridge API version.");
  }
  return {
    deviceToken: result.deviceToken,
    workspaceName: result.workspaceName.trim().slice(0, 120),
    role: result.role,
    expiresAt: typeof result.expiresAt === "string" ? result.expiresAt : null,
  };
}
