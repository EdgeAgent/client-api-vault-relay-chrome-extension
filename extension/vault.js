export const VAULT_STORAGE_KEY = "client-api-vault-envelope";
export const VAULT_MARKER = "client-api-vault-v1";
export const PBKDF2_ITERATIONS = 310000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encodeBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function randomBytes(length) {
  const value = new Uint8Array(length);
  crypto.getRandomValues(value);
  return value;
}

function assertPassword(password) {
  if (typeof password !== "string" || password.length < 12) {
    throw new Error("Use a vault password with at least 12 characters.");
  }
}

async function storageGet(key) {
  const data = await chrome.storage.local.get(key);
  return data[key] ?? null;
}

async function deriveKey(password, salt) {
  const sourceKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    sourceKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptPayload(password, payload, salt = randomBytes(16)) {
  const iv = randomBytes(12);
  const key = await deriveKey(password, salt);
  const plaintext = encoder.encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

  return {
    version: 1,
    cipher: "AES-GCM-256",
    kdf: "PBKDF2-SHA-256",
    iterations: PBKDF2_ITERATIONS,
    salt: encodeBase64(salt),
    iv: encodeBase64(iv),
    ciphertext: encodeBase64(new Uint8Array(ciphertext)),
    updatedAt: new Date().toISOString(),
  };
}

async function decryptPayload(password, envelope) {
  if (!envelope || envelope.version !== 1 || envelope.kdf !== "PBKDF2-SHA-256") {
    throw new Error("This vault format is not supported.");
  }

  const salt = decodeBase64(envelope.salt);
  const iv = decodeBase64(envelope.iv);
  const ciphertext = decodeBase64(envelope.ciphertext);
  const key = await deriveKey(password, salt);

  try {
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    const payload = JSON.parse(decoder.decode(plaintext));
    if (payload.marker !== VAULT_MARKER || !Array.isArray(payload.entries)) {
      throw new Error("The vault integrity marker is invalid.");
    }
    return payload;
  } catch {
    throw new Error("The vault password is incorrect or the encrypted data has changed.");
  }
}

export async function hasVault() {
  return Boolean(await storageGet(VAULT_STORAGE_KEY));
}

export async function createVault(password) {
  assertPassword(password);
  if (await hasVault()) {
    throw new Error("A vault already exists in this Chrome profile.");
  }

  const payload = { marker: VAULT_MARKER, entries: [], activeEntryId: null, bridge: null, createdAt: new Date().toISOString() };
  const envelope = await encryptPayload(password, payload);
  await chrome.storage.local.set({ [VAULT_STORAGE_KEY]: envelope });
  return payload;
}

export async function unlockVault(password) {
  assertPassword(password);
  const envelope = await storageGet(VAULT_STORAGE_KEY);
  return decryptPayload(password, envelope);
}

export async function saveVault(password, entries, createdAt, activeEntryId = null, bridge = null) {
  assertPassword(password);
  const existing = await storageGet(VAULT_STORAGE_KEY);
  const salt = existing ? decodeBase64(existing.salt) : randomBytes(16);
  const payload = {
    marker: VAULT_MARKER,
    entries,
    activeEntryId,
    bridge,
    createdAt: createdAt ?? new Date().toISOString(),
  };
  const envelope = await encryptPayload(password, payload, salt);
  await chrome.storage.local.set({ [VAULT_STORAGE_KEY]: envelope });
  return payload;
}

export async function removeVault() {
  await chrome.storage.local.remove(VAULT_STORAGE_KEY);
}

export function maskKey(value) {
  const compact = String(value ?? "").trim();
  if (compact.length < 9) return "••••••••";
  return `${compact.slice(0, 4)}••••••••${compact.slice(-4)}`;
}
