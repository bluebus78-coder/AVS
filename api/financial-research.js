const {timingSafeEqual} = require("node:crypto");
const {collectDart, collectFilings, validFilings, DATA_ERRORS, UPSTREAM_ERRORS} = require("../server/financials.cjs");
const {validOriginal, collectOriginal} = require("../server/filing-original.cjs");
function failure(res, error) {
  const code = error?.message;
  if (DATA_ERRORS.includes(code)) return res.status(422).json({error:code});
  return res.status(502).json({error:UPSTREAM_ERRORS.includes(code) ? code : "FINANCIAL_UPSTREAM_UNAVAILABLE"});
}

function authorized(header, secret) {
  if (typeof secret !== "string" || secret.length < 32 || typeof header !== "string") return false;
  const supplied = Buffer.from(header), expected = Buffer.from("Bearer " + secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function createHandler(env = process.env, collector = collectDart, filingCollector = collectFilings, originalCollector = collectOriginal) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    }
    // Operator credential is server-side only, never embedded in Android or website JS.
    if (!authorized(req.headers?.authorization, env.FINANCIAL_RESEARCH_TOKEN))
      return res.status(401).json({error: "UNAUTHORIZED"});
    if (!/^[a-zA-Z0-9]{40}$/.test(env.DART_API_KEY || ""))
      return res.status(503).json({error: "SERVER_NOT_CONFIGURED"});
    const b = req.body;
    if (b?.action === "original" && validOriginal(b)) {
      try { return res.status(200).json(await originalCollector(b, env.DART_API_KEY)); }
      catch (error) { return failure(res, error); }
    }
    if (b?.action === "filings" && validFilings(b)) {
      try { return res.status(200).json(await filingCollector(b, env.DART_API_KEY)); }
      catch (error) { return failure(res, error); }
    }
    if (!b || typeof b !== "object" || Array.isArray(b)
        || Object.keys(b).some(k => !["corpCode", "year", "report", "basis"].includes(k))
        || typeof b.corpCode !== "string" || !/^\d{8}$/.test(b.corpCode)
        || typeof b.year !== "string" || !/^20\d{2}$/.test(b.year)
        || Number(b.year) < 2015 || Number(b.year) > new Date().getUTCFullYear()
        || !["11011", "11012", "11013", "11014"].includes(b.report)
        || !["CFS", "OFS"].includes(b.basis))
      return res.status(400).json({error: "INVALID_REQUEST"});
    try {
      return res.status(200).json(await collector(b, env.DART_API_KEY));
    } catch (error) {
      return failure(res, error);
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
