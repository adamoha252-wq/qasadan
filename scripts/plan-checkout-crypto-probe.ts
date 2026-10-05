/**
 * Standalone decryption probe — replicates src/lib/payments/crypto.ts
 * decryptCredentials() without the server-only import, to check whether the
 * current PAYMENTS_MASTER_KEY can decrypt the stored waafipay credential blob.
 */
import { createDecipheriv } from "node:crypto";
import { PrismaClient } from "@prisma/client";

// load .env manually
const fs = require("fs");
const env = fs.readFileSync(".env", "utf8");
const KEY_RAW = env.match(/^PAYMENTS_MASTER_KEY=(.*)$/m)?.[1]?.trim();
const key = Buffer.from(KEY_RAW ?? "", "base64");
console.log("key configured:", !!KEY_RAW, "| decoded bytes:", key.length);

const db = new PrismaClient();

function decrypt(payload: string): Record<string, string> {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("bad format");
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8"));
}

async function main() {
  const rows = await db.paymentProvider.findMany();
  for (const row of rows) {
    console.log(`\n--- ${row.code} (active=${row.isActive}) ---`);
    if (!row.credentials) {
      console.log("credentials: EMPTY");
      continue;
    }
    try {
      const values = decrypt(row.credentials);
      console.log(
        "DECRYPT OK — keys:",
        Object.keys(values).join(", "),
        "| required present:",
        ["merchantUid", "storeId", "hppKey"].every((k) => values[k]?.trim())
      );
    } catch (e) {
      console.log("DECRYPT FAILED:", (e as Error).message);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
