/**
 * Payment system — shared types (safe for client AND server).
 *
 * This module contains NO secrets and NO server-only code: the admin UI
 * imports the provider definitions from the registry to render the
 * configuration forms dynamically.
 */

/** A single credential field of a provider (e.g. WAAFI Pay "HPP Key"). */
export type CredentialField = {
  key: string;
  label: string;
  /** true = secret value. Never returned to the browser (masked instead). */
  secret: boolean;
  /** Shown in the admin form. */
  placeholder?: string;
  hint?: string;
};

/** A logical grouping of credential fields shown in the admin form. */
export type CredentialGroup = {
  title: string;
  description?: string;
  fieldKeys: string[];
};

/** A payment method supported by a provider (e.g. MWALLET_ACCOUNT). */
export type ProviderMethod = {
  code: string;
  label: string;
  description?: string;
};

/** A currency supported by a provider. */
export type ProviderCurrency = {
  code: string;
  label: string;
};

/**
 * Static definition of a payment provider. Definitions live in the registry
 * (src/lib/payments/registry.ts). Adding a new provider (SoomarPay, PayPal…)
 * means adding a definition + adapter — the admin UI, API and storage all
 * adapt automatically.
 */
export type ProviderDefinition = {
  code: string; // "waafipay" — unique key, matches DB PaymentProvider.code
  name: string; // "WAAFI Pay"
  tagline: string;
  description: string;
  docsUrl: string;
  methods: ProviderMethod[];
  currencies: ProviderCurrency[];
  credentialFields: CredentialField[];
  credentialGroups: CredentialGroup[];
  /** Fields that must all be set before the provider can accept payments. */
  requiredFields: string[];
  defaultMethods: string[];
  defaultCurrencies: string[];
  defaultSandbox: boolean;
  /** lucide icon name for the admin UI. */
  icon: string;
  /** false = planned provider, shown as "coming soon", cannot be added yet. */
  implemented: boolean;
};

/** Derived, human-readable lifecycle status of a configured provider. */
export type ProviderStatusKey =
  | "NOT_CONNECTED"
  | "INCOMPLETE"
  | "NOT_TESTED"
  | "PARTIAL"
  | "CONNECTED"
  | "ACTIVE"
  | "FAILED";

export const PROVIDER_STATUS_LABELS: Record<ProviderStatusKey, string> = {
  NOT_CONNECTED: "Not Connected",
  INCOMPLETE: "Setup Incomplete",
  NOT_TESTED: "Not Tested",
  PARTIAL: "Partially Verified",
  CONNECTED: "Connected",
  ACTIVE: "Active",
  FAILED: "Connection Failed",
};

/** Result of a provider "Test Connection" run. */
export type ConnectionTestOutcome = "PASS" | "PARTIAL" | "FAIL";

/** How a credential field is exposed to the admin UI (never the raw secret). */
export type CredentialPublicView = {
  label: string;
  secret: boolean;
  configured: boolean;
  /** Only for non-secret identifiers (e.g. merchantUid). */
  value?: string;
  /** Only for secrets — e.g. "••••••••7f3a". */
  masked?: string;
};

/** API-safe representation of a stored payment provider. */
export type ProviderPublicView = {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  isSandbox: boolean;
  isActive: boolean;
  methods: string[];
  currencies: string[];
  status: { key: ProviderStatusKey; label: string };
  /** Human labels of required credential fields not yet set. */
  missingFields: string[];
  credentials: Record<string, CredentialPublicView>;
  lastTest: {
    at: string | null;
    outcome: ConnectionTestOutcome | null;
    message: string | null;
  };
  createdAt: string;
};
