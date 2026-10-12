export function endpointPermissionOrigin(baseUrl) {
  const parsed = new URL(baseUrl);
  const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) {
    throw new Error("Only HTTPS provider URLs are allowed, except local loopback services.");
  }
  return `${parsed.protocol}//${parsed.host}/*`;
}

export async function requestEndpointPermission(chromeApi, baseUrl) {
  const parsed = new URL(baseUrl);
  const origin = endpointPermissionOrigin(baseUrl);
  const allowed = await chromeApi.permissions.contains({ origins: [origin] });
  if (allowed) return origin;
  const granted = await chromeApi.permissions.request({ origins: [origin] });
  if (!granted) throw new Error(`Permission to contact ${parsed.host} was not granted.`);
  return origin;
}

export async function revokeEndpointPermission(chromeApi, baseUrl) {
  const origin = endpointPermissionOrigin(baseUrl);
  return chromeApi.permissions.remove({ origins: [origin] });
}
