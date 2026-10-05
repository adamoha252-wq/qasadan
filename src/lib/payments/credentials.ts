import "server-only";

/**
 * Server-side helpers for working with stored payment providers:
 * decryption, status derivation and the API-safe "public view"
 * (the ONLY shape that ever leaves the server).
 */

import { db } from "@/lib/db";
import { decryptCredentials, encryptCredentials, maskSecret, PaymentsCryptoError } from "./crypto";
import { getProviderDefinition } from "./registry";
import {
  PROVIDER_STATUS_LABELS,
  type ConnectionTestOutcome,
  type CredentialPublicView,
  type ProviderPublicView,
  type ProviderStatusKey,
} from "./types";

export type PaymentProviderRow = {
  id: string;
  code: string;
  credentials: string;
  isSandbox: boolean;
  isActive: boolean;
  methods: string;
  currencies: string;
  lastTestedAt: Date | null;
  lastTestOutcome: string | null;
  lastTestMsg: string | null;
  createdAt: Date;
};

/**
 * Decrypts the stored credentials blob.
 * A decryption failure (e.g. server key changed) is treated as
 * "credentials unreadable" — surfaced to the admin, never thrown at users.
 */
export function loadCredentials(row: Pick<PaymentProviderRow, "credentials">): {
  values: Record<string, string>;
  error: string | null;
} {
  if (!row.credentials) return { values: {}, error: null };
  try {
    return { values: decryptCredentials(row.credentials), error: null };
  } catch (error) {
    if (error instanceof PaymentsCryptoError) {
      return { values: {}, error: error.message };
    }
    return {
      values: {},
      error: "Stored credentials could not be decrypted — please re-enter them.",
    };
  }
}

export function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function deriveStatus(
  row: Pick<PaymentProviderRow, "credentials" | "lastTestOutcome" | "isActive">,
  credentialValues: Record<string, string>,
  missingFields: string[]
): { key: ProviderStatusKey; label: string } {
  const hasAny = Object.keys(credentialValues).length > 0;
  if (!hasAny && !row.credentials) {
    return { key: "NOT_CONNECTED", label: PROVIDER_STATUS_LABELS.NOT_CONNECTED };
  }
  if (missingFields.length > 0) {
    return { key: "INCOMPLETE", label: PROVIDER_STATUS_LABELS.INCOMPLETE };
  }
  const outcome = row.lastTestOutcome;
  if (!outcome) return { key: "NOT_TESTED", label: PROVIDER_STATUS_LABELS.NOT_TESTED };
  if (outcome === "FAIL") return { key: "FAILED", label: PROVIDER_STATUS_LABELS.FAILED };
  if (outcome === "PARTIAL") return { key: "PARTIAL", label: PROVIDER_STATUS_LABELS.PARTIAL };
  return row.isActive
    ? { key: "ACTIVE", label: PROVIDER_STATUS_LABELS.ACTIVE }
    : { key: "CONNECTED", label: PROVIDER_STATUS_LABELS.CONNECTED };
}

/**
 * Builds the API-safe view of a provider. GUARANTEES:
 *  - secret values are never included (only masked tails)
 *  - the decrypted blob itself never leaves this module's caller
 */
export function toProviderPublicView(row: PaymentProviderRow): ProviderPublicView {
  const def = getProviderDefinition(row.code);
  const { values, error: decryptError } = loadCredentials(row);

  // If decryption failed but a blob exists, treat as configured-but-unreadable
  const missingFields = (def?.requiredFields ?? []).filter(
    (key) => !values[key] || values[key].trim() === ""
  );

  const credentialsView: Record<string, CredentialPublicView> = {};
  for (const field of def?.credentialFields ?? []) {
    const value = values[field.key];
    const configured = Boolean(value && value.trim() !== "");
    if (field.secret) {
      credentialsView[field.key] = {
        label: field.label,
        secret: true,
        configured,
        ...(configured ? { masked: maskSecret(value) } : {}),
      };
    } else {
      credentialsView[field.key] = {
        label: field.label,
        secret: false,
        configured,
        ...(configured ? { value } : {}),
      };
    }
  }

  const status = deriveStatus(row, values, missingFields);

  const lastTestMessage = decryptError
    ? decryptError
    : row.lastTestMsg;

  return {
    id: row.id,
    code: row.code,
    name: def?.name ?? row.code,
    description: def?.description ?? "",
    icon: def?.icon ?? "Landmark",
    isSandbox: row.isSandbox,
    isActive: row.isActive,
    methods: parseJsonArray(row.methods),
    currencies: parseJsonArray(row.currencies),
    status,
    missingFields: missingFields.map(
      (key) => def?.credentialFields.find((f) => f.key === key)?.label ?? key
    ),
    credentials: credentialsView,
    lastTest: {
      at: row.lastTestedAt ? row.lastTestedAt.toISOString() : null,
      outcome: (row.lastTestOutcome as ConnectionTestOutcome | null) ?? null,
      message: lastTestMessage,
    },
    createdAt: row.createdAt.toISOString(),
  };
}

/** Loads a provider row or null. */
export async function findProvider(id: string) {
  return db.paymentProvider.findUnique({ where: { id } });
}

/**
 * Applies a credentials patch: set/replace non-empty values, remove on "".
 * Returns the merged map (still unencrypted).
 */
export function applyCredentialPatch(
  current: Record<string, string>,
  patch: Record<string, string>
): Record<string, string> {
  const merged: Record<string, string> = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    const trimmed = value.trim();
    if (trimmed === "") {
      delete merged[key];
    } else {
      merged[key] = trimmed;
    }
  }
  return merged;
}

/** Encrypts and persists the credentials blob for a provider row. */
export async function saveCredentials(id: string, values: Record<string, string>) {
  const blob = Object.keys(values).length > 0 ? encryptCredentials(values) : "";
  await db.paymentProvider.update({ where: { id }, data: { credentials: blob } });
}
