/**
 * Repairs the local preview DB provider credentials so the public checkout
 * renders: the stored waafipay blob was missing merchantUid (left over from
 * the phase 4/5 E2E demo scripts), which made the provider credential-
 * incomplete and filtered it out of the public catalog.
 *
 * Re-saves a COMPLETE dummy credential set (preview only — real WAAFI
 * merchant credentials are entered by the admin through the UI later).
 * Replicates encryptCredentials() from src/lib/payments/crypto.ts standalone.
 */
import { createCipheriv, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const fs = require("fs");
const env = fs.readFileSync(".env", "utf8");
const KEY_RAW = env.match(/^PAYMENTS_MASTER_KEY=(.*)$/m)?.[1]?.trim();
const key = Buffer.from(KEY_RAW ?? "", "base64");

function encrypt(data: Record<string, string>): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(data), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

const db = new PrismaClient();

async function main() {
  const dummy = {
    merchantUid: "MQ1234567", // dummy preview value — admin enters real ones in the UI
    storeId: "123456",
    hppKey: "abcdefghijklmnopqrstuvwxyz123456",
  };
  const blob = encrypt(dummy);
  const row = await db.paymentProvider.update({
    where: { code: "waafipay" },
    data: { credentials: blob, lastTestedAt: null, lastTestOutcome: null, lastTestMsg: null },
  });
  console.log("waafipay credentials repaired (dummy preview set).");
  console.log("active:", row.isActive, "| methods:", row.methods, "| currencies:", row.currencies);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
