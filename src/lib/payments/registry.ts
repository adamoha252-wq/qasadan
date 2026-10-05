/**
 * Payment provider registry — the catalog every part of the system reads.
 *
 * To add a new provider later (SoomarPay, PayPal, Stripe…):
 *   1. Add a ProviderDefinition below (implemented: true once its adapter
 *      exists in src/lib/payments/).
 *   2. Implement the adapter (see src/lib/payments/waafipay.ts).
 * Everything else — admin UI, credential storage, test-connection flow —
 * adapts automatically from the definition.
 *
 * Field values below follow the official WAAFI Pay API documentation:
 * https://docs.waafipay.com/
 */

import type { ProviderDefinition } from "./types";

const waafipayDefinition: ProviderDefinition = {
  code: "waafipay",
  name: "WAAFI Pay",
  tagline: "Somalia's leading mobile money & card gateway",
  description:
    "Accept EVC Plus, ZAAD, SAHAL and WAAFI wallet payments, bank accounts and Visa/Mastercard through the WAAFI Pay gateway (Telesom).",
  docsUrl: "https://docs.waafipay.com/",
  icon: "Smartphone",
  implemented: true,

  methods: [
    {
      code: "MWALLET_ACCOUNT",
      label: "Mobile Wallet",
      description: "EVC Plus, ZAAD, SAHAL and WAAFI wallets",
    },
    {
      code: "CREDIT_CARD",
      label: "Card Payment",
      description: "Visa and Mastercard",
    },
    {
      code: "MWALLET_BANKACCOUNT",
      label: "Bank Account",
      description: "Direct bank account payment",
    },
  ],

  currencies: [
    { code: "USD", label: "US Dollar" },
    { code: "SLSH", label: "Somali Shilling" },
    { code: "DJF", label: "Djiboutian Franc" },
  ],

  credentialFields: [
    {
      key: "merchantUid",
      label: "Merchant UID",
      secret: false,
      hint: "Your WAAFI merchant identifier (7–15 characters), issued with your merchant account.",
      placeholder: "e.g. MQ1234567",
    },
    {
      key: "storeId",
      label: "Store ID",
      secret: false,
      hint: "Identifies your store's hosted checkout (issued with your HPP credentials).",
      placeholder: "e.g. ST1234567",
    },
    {
      key: "hppKey",
      label: "HPP Key",
      secret: true,
      hint: "Hosted Payment Page secret key (20–40 characters). Required for secure checkout, payment verification and webhooks.",
      placeholder: "Your hosted checkout secret key",
    },
    {
      key: "apiUserId",
      label: "API User ID",
      secret: false,
      hint: "Optional — for server-to-server API calls (7–15 characters).",
      placeholder: "e.g. AU1234567",
    },
    {
      key: "apiKey",
      label: "API Key",
      secret: true,
      hint: "Optional — server-to-server API secret key (20–40 characters).",
      placeholder: "Your direct API secret key",
    },
    {
      key: "webhookSecret",
      label: "Webhook Secret",
      secret: true,
      hint: "Optional — the signing secret WAAFI Pay shows ONCE when you register the webhook URL. Required for the incoming-webhook endpoint to accept signed events.",
      placeholder: "The webhook signing secret",
    },
  ],

  credentialGroups: [
    {
      title: "Hosted Checkout credentials",
      description:
        "Required for the client checkout flow, payment verification and webhooks. Issued with your WAAFI Pay merchant account.",
      fieldKeys: ["merchantUid", "storeId", "hppKey"],
    },
    {
      title: "Direct API credentials (optional)",
      description:
        "Only needed for server-to-server charges. The checkout flow does not require these.",
      fieldKeys: ["apiUserId", "apiKey"],
    },
    {
      title: "Webhook (optional)",
      description:
        "Register the webhook URL in your WAAFI Pay merchant account, then paste the signing secret here so signed webhook events are accepted.",
      fieldKeys: ["webhookSecret"],
    },
  ],

  requiredFields: ["merchantUid", "storeId", "hppKey"],
  defaultMethods: ["MWALLET_ACCOUNT", "CREDIT_CARD"],
  defaultCurrencies: ["USD", "SLSH"],
  defaultSandbox: true,
};

/** Planned providers — shown as "coming soon" in the admin catalog. */
const plannedProviders: ProviderDefinition[] = [
  {
    code: "soomarpay",
    name: "SoomarPay",
    tagline: "Somali digital payments",
    description: "Planned integration — the provider framework supports adding it without changing the checkout flow.",
    docsUrl: "https://soomarpay.com/",
    icon: "Wallet",
    implemented: false,
    methods: [],
    currencies: [],
    credentialFields: [],
    credentialGroups: [],
    requiredFields: [],
    defaultMethods: [],
    defaultCurrencies: [],
    defaultSandbox: true,
  },
  {
    code: "paypal",
    name: "PayPal",
    tagline: "International payments",
    description: "Planned integration — for international clients paying by PayPal account or card.",
    docsUrl: "https://developer.paypal.com/",
    icon: "Globe",
    implemented: false,
    methods: [],
    currencies: [],
    credentialFields: [],
    credentialGroups: [],
    requiredFields: [],
    defaultMethods: [],
    defaultCurrencies: [],
    defaultSandbox: true,
  },
];

const ALL_DEFINITIONS: ProviderDefinition[] = [waafipayDefinition, ...plannedProviders];

const BY_CODE = new Map(ALL_DEFINITIONS.map((d) => [d.code, d]));

export function listProviderDefinitions(): ProviderDefinition[] {
  return ALL_DEFINITIONS;
}

export function getProviderDefinition(code: string): ProviderDefinition | undefined {
  return BY_CODE.get(code);
}

export function isImplementedProvider(code: string): boolean {
  return BY_CODE.get(code)?.implemented ?? false;
}
