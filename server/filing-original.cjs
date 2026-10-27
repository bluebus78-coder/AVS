"use strict";
const {createHash} = require("node:crypto");
const {dartStatus, safeError} = require("./financials.cjs");
// Base64 plus metadata remains below Vercel's 4.5 MB response limit.
const CHUNK = 3_000_000;
const MAX_BYTES = 32_000_000;
const cache = new Map();

function validOriginal(b) {
  return b && !Array.isArray(b) && Object.keys(b).every(k => ["action", "receiptId", "report", "kind", "offset"].includes(k))
    && typeof b.receiptId === "string" && /^\d{14}$/.test(b.receiptId) && ["document", "xbrl"].includes(b.kind)
    && ["11011", "11012", "11013", "11014"].includes(b.report)
    && Number.isInteger(b.offset) && b.offset >= 0 && b.offset < MAX_BYTES && b.offset % 1_000_000 === 0;
}

async function collectOriginal(b, key, fetcher = fetch) {
  const url = new URL("https://opendart.fss.or.kr/api/" + (b.kind === "xbrl" ? "fnlttXbrl.xml" : "document.xml"));
  url.search = new URLSearchParams({crtfc_key:key, rcept_no:b.receiptId,
    ...(b.kind === "xbrl" ? {reprt_code:b.report} : {})}).toString();
  try {
    const cacheKey = `${b.receiptId}:${b.kind}:${b.report}`;
    const cached = fetcher === fetch ? cache.get(cacheKey) : null;
    let bytes = cached && Date.now()-cached.at < 300_000 ? cached.bytes : null;
    if (!bytes) {
    const response = await fetcher(url, {signal:AbortSignal.timeout(240000), redirect:"error"});
    if (!response.ok) throw new Error("DART_HTTP_ERROR");
    const reader = response.body.getReader(), parts = [];
    let size = 0;
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_BYTES) throw new Error("RESPONSE_TOO_LARGE");
        parts.push(Buffer.from(value));
      }
    } finally { await reader.cancel().catch(() => {}); }
    bytes = Buffer.concat(parts);
    if (bytes.subarray(0,4).toString("hex") !== "504b0304") {
      const status = bytes.subarray(0,4096).toString("utf8").match(/<status>\s*(\d{3})\s*<\/status>/)?.[1];
      dartStatus(status);
      throw new Error("DART_INVALID_RESPONSE");
    }
    if (fetcher === fetch) {
      let used=[...cache.values()].reduce((n,v)=>n+v.bytes.length,0);
      while (cache.size && (cache.size >= 24 || used+bytes.length>64_000_000)) {
        const oldest=cache.keys().next().value;
        used-=cache.get(oldest).bytes.length;
        cache.delete(oldest);
      }
      cache.set(cacheKey,{at:Date.now(),bytes});
    }
    }
    if (b.offset >= bytes.length) throw new Error("DART_INVALID_RESPONSE");
    return {source:"DART", receiptId:b.receiptId, report:b.report, kind:b.kind,
      collectedAt:new Date().toISOString(), sha256:createHash("sha256").update(bytes).digest("hex"),
      totalBytes:bytes.length, offset:b.offset, nextOffset:b.offset + CHUNK < bytes.length ? b.offset + CHUNK : null,
      encoding:"base64", bytes:bytes.subarray(b.offset,b.offset+CHUNK).toString("base64")};
  } catch (error) { throw safeError(error); }
}
module.exports = {validOriginal, collectOriginal};
