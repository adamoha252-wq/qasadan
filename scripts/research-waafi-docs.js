/**
 * research-waafi-docs.js
 * RESEARCH ONLY — extracts WAAFI Pay docs pages (docs.waafipay.com) via
 * z-ai-web-dev-sdk page_reader and greps out HPP checkout-flow facts.
 *
 * Usage: bun scripts/research-waafi-docs.js
 */
import ZAI from "z-ai-web-dev-sdk";
import { writeFileSync } from "node:fs";

const PAGES = [
  { slug: "index", url: "https://docs.waafipay.com/" },
  { slug: "api-introduction", url: "https://docs.waafipay.com/api-introduction" },
  { slug: "hpp", url: "https://docs.waafipay.com/hpp" },
  { slug: "hpp-api", url: "https://docs.waafipay.com/hpp-api" },
  { slug: "webhooks", url: "https://docs.waafipay.com/webhooks" },
  { slug: "purchase-api", url: "https://docs.waafipay.com/purchase-api" },
  { slug: "quickstart", url: "https://docs.waafipay.com/quickstart" },
];

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(td|th)>/gi, " | ")
    .replace(/<\/(tr|p|li|div|pre|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n");
}

async function main() {
  const zai = await ZAI.create();
  const summary = {};

  for (const { slug, url } of PAGES) {
    try {
      const res = await zai.functions.invoke("page_reader", { url });
      const html = res?.data?.html ?? "";
      const text = htmlToText(html);
      writeFileSync(`/tmp/waafi-reader-${slug}.txt`, text);
      summary[url] = { status: res?.status, title: res?.data?.title, chars: text.length };
    } catch (e) {
      summary[url] = { error: String(e?.message || e) };
    }
  }

  console.log(JSON.stringify(summary, null, 2));

  // Focused extraction: HPP facts
  const hpp = (() => {
    try { return require("node:fs").readFileSync("/tmp/waafi-reader-hpp-api.txt", "utf8"); }
    catch { return ""; }
  })();
  if (hpp) {
    const keywords = ["HPP_PURCHASE", "HPP_REFUNDPURCHASE", "HPP_GETTRANINFO", "HPP_GETRESULTINFO",
      "hppUrl", "directPaymentLink", "hppSuccessCallbackUrl", "hppFailureCallbackUrl", "hppRespDataFormat",
      "subscriptionId", "referenceId", "transactionId"];
    const lines = hpp.split("\n").map(l => l.trim());
    const hits = lines.filter(l => keywords.some(k => l.includes(k)));
    console.log("\n=== hpp-api keyword lines ===\n" + hits.join("\n"));
  }
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
