import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Server-side credential encryption (AES-256-GCM).
 *
 * Payment provider credentials are encrypted before they touch the database
 * and are only ever decrypted inside server code (API routes / payment
 * verification). The browser never receives secret values.
 *
 * The 32-byte master key comes from the PAYMENTS_MASTER_KEY environment
 * variable (base64). It lives ONLY on the server (Vercel env vars / .env,
 * which is git-ignored) and is never committed to GitHub.
 *
 * Ciphertext format: "v1:<base64 iv>:<base64 authTag>:<base64 ciphertext>"
 * The "v1" prefix allows future key rotation without breaking old records.
 */

const KEY_VERSION = "v1";

export class PaymentsCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentsCryptoError";
  }
}

function getMasterKey(): Buffer {
  const raw = process.env.PAYMENTS_MASTER_KEY;
  if (!raw) {
    throw new PaymentsCryptoError(
      "Payment credentials cannot be encrypted: PAYMENTS_MASTER_KEY is not configured on the server."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new PaymentsCryptoError(
      "PAYMENTS_MASTER_KEY must be a base64-encoded 32-byte key (generate one with: openssl rand -base64 32)."
    );
  }
  return key;
}

/** Whether the encryption key is configured (for admin UI warnings). */
export function isCredentialEncryptionConfigured(): boolean {
  try {
    getMasterKey();
    return true;
  } catch {
    return false;
  }
}

/** Encrypts a credentials object into a storable string. */
export function encryptCredentials(data: Record<string, string>): string {
  const key = getMasterKey();
  const iv = randomBytes(12); // 96-bit IV — recommended for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(data), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    KEY_VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/** Decryption failure is surfaced as a typed error (e.g. server key changed). */
export function decryptCredentials(payload: string): Record<string, string> {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== KEY_VERSION) {
    throw new PaymentsCryptoError("Stored credentials have an unreadable format.");
  }
  try {
    const [, ivB64, tagB64, dataB64] = parts;
    const key = getMasterKey();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    const parsed = JSON.parse(plaintext.toString("utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    // Wrong key, tampered data or corrupted row — never leak the raw error.
    throw new PaymentsCryptoError(
      "Stored credentials could not be decrypted. The server encryption key may have changed — please re-enter the provider credentials."
    );
  }
}

/** Masks a secret for admin display, e.g. "••••••••7f3a". */
export function maskSecret(value: string): string {
  const tail = value.length >= 8 ? ` ${value.slice(-4)}` : "";
  return `${"•".repeat(8)}${tail}`;
}

/** Constant-time string compare for future signature checks (webhooks). */
export function secureEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
