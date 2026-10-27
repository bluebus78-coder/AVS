"use strict";

const ACCOUNTS = Object.freeze({
  revenue: ["ifrs-full_Revenue", "ifrs_Revenue"],
  operatingProfit: ["dart_OperatingIncomeLoss"],
  netIncome: ["ifrs-full_ProfitLoss", "ifrs_ProfitLoss"],
  assets: ["ifrs-full_Assets", "ifrs_Assets"],
  equity: ["ifrs-full_Equity", "ifrs_Equity"],
  liabilities: ["ifrs-full_Liabilities", "ifrs_Liabilities"],
  operatingCashFlow: ["ifrs-full_CashFlowsFromUsedInOperatingActivities", "ifrs_CashFlowsFromUsedInOperatingActivities"],
});
const DATA_ERRORS = Object.freeze(["FINANCIAL_IDENTITY_OR_CURRENCY_MISMATCH",
  "AMBIGUOUS_FINANCIAL_RECEIPT", "FINANCIAL_DATA_UNAVAILABLE", "RESPONSE_TOO_LARGE"]);
const UPSTREAM_ERRORS = Object.freeze(["DART_TIMEOUT", "DART_HTTP_ERROR", "DART_INVALID_RESPONSE",
  "DART_AUTH_ERROR", "DART_QUOTA_EXCEEDED", "DART_MAINTENANCE", "DART_FILE_UNAVAILABLE"]);

function dartStatus(status) {
  if (status === "000") return;
  const reason = ["010", "011", "012", "901"].includes(status) ? "DART_AUTH_ERROR"
    : status === "020" ? "DART_QUOTA_EXCEEDED" : status === "800" ? "DART_MAINTENANCE"
    : ["013", "014"].includes(status) ? "DART_FILE_UNAVAILABLE" : "DART_INVALID_RESPONSE";
  throw new Error(reason);
}

function safeError(error) {
  if ([...DATA_ERRORS, ...UPSTREAM_ERRORS].includes(error?.message)) return new Error(error.message);
  return new Error(["TimeoutError", "AbortError"].includes(error?.name)
    ? "DART_TIMEOUT" : "FINANCIAL_UPSTREAM_UNAVAILABLE");
}

function parseJson(text) {
  try { return JSON.parse(text); }
  catch { throw new Error("DART_INVALID_RESPONSE"); }
}

function amount(raw) {
  if (raw == null || raw === "" || raw === "-") return null;
  const value = String(raw).trim().replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= Number.MAX_SAFE_INTEGER ? number : null;
}

function normalizeDart(payload, request, collectedAt) {
  if (payload.status !== "000" || !Array.isArray(payload.list) || !payload.list.length)
    throw new Error("FINANCIAL_DATA_UNAVAILABLE");
  const now = new Date(collectedAt);
  if (!Number.isFinite(now.getTime())) throw new Error("INVALID_COLLECTION_TIME");
  const rows = payload.list;
  if (rows.some(r => r.corp_code !== request.corpCode || r.bsns_year !== request.year
      || r.reprt_code !== request.report))
    throw new Error("FINANCIAL_IDENTITY_OR_CURRENCY_MISMATCH");
  const currencies = [...new Set(rows.map(r=>r.currency))];
  if (currencies.length !== 1 || !["KRW", "USD", "CNY", "HKD", "SGD", "JPY", "EUR"].includes(currencies[0]))
    throw new Error("FINANCIAL_IDENTITY_OR_CURRENCY_MISMATCH");
  const currency = currencies[0];
  const receipts = [...new Set(rows.map(r => r.rcept_no))];
  if (receipts.length !== 1 || !/^\d{14}$/.test(receipts[0]))
    throw new Error("AMBIGUOUS_FINANCIAL_RECEIPT");
  const metrics = {}, previous = {}, conflicts = [], missing = [];
  for (const [name, ids] of Object.entries(ACCOUNTS)) {
    const selected = rows.filter(r => ids.includes(r.account_id)
      && (r.account_detail == null || ["", "-"].includes(r.account_detail))
      && (name === "operatingCashFlow" ? r.sj_div === "CF"
        : ["assets", "equity", "liabilities"].includes(name) ? r.sj_div === "BS" : ["IS", "CIS"].includes(r.sj_div)));
    const balance = ["assets", "equity", "liabilities"].includes(name);
    // Interim statements may contain both quarter-only and year-to-date values. Never mix them.
    const interimIncome = !balance && name !== "operatingCashFlow" && request.report !== "11011";
    const currentKey = interimIncome ? "thstrm_add_amount" : "thstrm_amount";
    // CF is cumulative already; its comparative interim amount is frmtrm_q_amount.
    const priorKey = interimIncome ? "frmtrm_add_amount"
      : name === "operatingCashFlow" && request.report !== "11011" ? "frmtrm_q_amount" : "frmtrm_amount";
    for (const [key, target] of [[currentKey, metrics], [priorKey, previous]]) {
      const values = [...new Set(selected.map(r => amount(r[key])).filter(v => v !== null))];
      target[name] = values.length === 1 ? values[0] : null;
      if (values.length > 1) conflicts.push(name + ":" + key);
    }
    if (metrics[name] === null) missing.push(name);
  }
  return {
    schema: 1, source: "DART", corpCode: request.corpCode, businessYear: request.year,
    reportCode: request.report, statementBasis: request.basis, currency, unit: currency === "KRW" ? "won" : currency,
    duration: request.report === "11011" ? "annual" : "year-to-date",
    receiptId: receipts[0], collectedAt: now.toISOString(), usableFrom: now.toISOString(),
    originalFilingVerified: false, historicalBacktestAllowed: false,
    metrics, previous, missing, conflicts,
    note: "Current API response may contain corrections. Collection time is the earliest proven availability; do not backdate to the fiscal period or receipt date.",
  };
}

async function collectDart(request, key, fetcher = fetch, now = new Date()) {
  if (!/^[a-zA-Z0-9]{40}$/.test(key || "")) throw new Error("SERVER_NOT_CONFIGURED");
  const url = new URL("https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json");
  url.search = new URLSearchParams({crtfc_key: key, corp_code: request.corpCode,
    bsns_year: request.year, reprt_code: request.report, fs_div: request.basis}).toString();
  try {
    const response = await fetcher(url, {signal: AbortSignal.timeout(45000), redirect: "error"});
    if (!response.ok) throw new Error("DART_HTTP_ERROR");
    const payload = parseJson(await boundedText(response));
    if (payload.status === "013") return {source:"DART",status:"NO_DATA",...request,collectedAt:now.toISOString()};
    dartStatus(payload.status);
    return normalizeDart(payload, request, now.toISOString());
  } catch (error) {
    // Fetch exceptions can contain the URL (and credential). Never forward/log them.
    throw safeError(error);
  }
}

async function boundedText(response, limit = 2_000_000) {
  if (!response.body?.getReader) {
    const text = await response.text();
    if (Buffer.byteLength(text) > limit) throw new Error("RESPONSE_TOO_LARGE");
    return text;
  }
  const reader = response.body.getReader(), chunks = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new Error("RESPONSE_TOO_LARGE");
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally { await reader.cancel().catch(() => {}); }
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{8}$/.test(value)) return false;
  const text = value.slice(0,4)+"-"+value.slice(4,6)+"-"+value.slice(6);
  const time = new Date(text+"T00:00:00Z");
  return Number.isFinite(time.getTime()) && time.toISOString().slice(0,10) === text;
}

function validFilings(b) {
  if (Object.keys(b).some(k=>!["action","start","end","page","market","reportType"].includes(k))
      || (b.reportType !== undefined && b.reportType !== "A001")
      || !validDate(b.start) || !validDate(b.end) || b.start > b.end
      || !Number.isInteger(b.page) || b.page < 1 || b.page > 1000 || !["Y","K","N","E"].includes(b.market)) return false;
  const day = s=>Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6));
  return day(b.end)-day(b.start) <= 89*86400000;
}

async function collectFilings(request, key, fetcher = fetch, now = new Date()) {
  const url = new URL("https://opendart.fss.or.kr/api/list.json");
  url.search = new URLSearchParams({crtfc_key:key,bgn_de:request.start,end_de:request.end,
    page_no:String(request.page),page_count:"100",corp_cls:request.market,
    pblntf_ty:"A",...(request.reportType ? {pblntf_detail_ty:request.reportType} : {}),
    last_reprt_at:"N",sort:"date",sort_mth:"asc"}).toString();
  try {
    const response=await fetcher(url,{signal:AbortSignal.timeout(45000),redirect:"error"});
    if(!response.ok) throw new Error("DART_HTTP_ERROR");
    const p=parseJson(await boundedText(response));
    if(p.status === "013") return {source:"DART",collectedAt:now.toISOString(),totalCount:0,totalPages:0,records:[]};
    dartStatus(p.status);
    if(p.status !== "000" || !Array.isArray(p.list) || p.list.length>100) throw new Error();
    const records=p.list.map(r=>{
      if(!/^\d{8}$/.test(r.corp_code)||!/^\d{14}$/.test(r.rcept_no)||!validDate(r.rcept_dt)
          || r.corp_cls!==request.market || r.rcept_dt<request.start || r.rcept_dt>request.end) throw new Error();
      return {corpCode:r.corp_code,stockCode:r.stock_code,name:r.corp_name,market:r.corp_cls,
        receiptId:r.rcept_no,receiptDate:r.rcept_dt,reportName:r.report_nm,remarks:r.rm};
    });
    if(!Number.isInteger(p.total_count)||!Number.isInteger(p.total_page)||p.page_no!==request.page) throw new Error();
    return {source:"DART",collectedAt:now.toISOString(),totalCount:p.total_count,totalPages:p.total_page,records};
  } catch (error) { throw safeError(error); }
}

module.exports = {amount, normalizeDart, collectDart, boundedText, validFilings, collectFilings, DATA_ERRORS, UPSTREAM_ERRORS, dartStatus, safeError};
