import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from "crypto";

/**
 * Password hashing utilities for QASADAN admin authentication.
 * Uses Node's built-in scrypt (no external dependencies).
 * Stored format: scrypt$N$r$p$saltHex$hashHex
 */

const SCRYPT_N = 16384; // CPU/memory cost
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p });
  return `scrypt$${SCRYPT_N}$${SCRYPT_r}$${SCRYPT_p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [algo, nStr, rStr, pStr, saltHex, hashHex] = stored.split("$");
    if (algo !== "scrypt") return false;
    const N = parseInt(nStr, 10);
    const r = parseInt(rStr, 10);
    const p = parseInt(pStr, 10);
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(password, salt, expected.length, { N, r, p });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Generates a cryptographically random session token (256-bit). */
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/** Generates a secure random id for filenames etc. */
export function generateId(): string {
  return randomUUID();
}
