import * as XLSX from "xlsx";

export type RateValue = number | string | null;

export interface RateItem {
  id: string;
  company: string;
  product: string;
  model: string;
  cash: RateValue;
  installment: RateValue;
  fix: RateValue;
  remarks: string;
  month: number; // 1-12
  year: number;
  period: number; // year*12 + month
  // pre-computed search helpers
  nModel: string;
  nAll: string;
}

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const norm = (s: unknown) =>
  String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export const isHaier = (company: string) => norm(company).includes("haier");

export const periodLabel = (month: number, year: number) =>
  `${MONTHS[month - 1] ?? ""} ${year}`.trim();

/* ------------------------------------------------------------------ */
/* Value parsing                                                       */
/* ------------------------------------------------------------------ */

function parseRate(v: unknown): RateValue {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s || s === "-" || s === "0") return s === "0" ? 0 : null;
  const cleaned = s.replace(/rs\.?|pkr|\/-|,|\s/gi, "");
  if (/^\d+(\.\d+)?$/.test(cleaned)) return Number(cleaned);
  return s; // keep text such as "Call" or "N/A"
}

export function formatRate(v: RateValue): string {
  if (v === null || v === "") return "—";
  if (typeof v === "number") return "Rs " + Math.round(v).toLocaleString("en-US");
  return v;
}

function monthFromText(s: string): number | null {
  const t = s.toLowerCase();
  for (let i = 0; i < 12; i++) {
    if (t.includes(MONTHS[i].slice(0, 3).toLowerCase())) return i + 1;
  }
  return null;
}

function parseMonthYear(mRaw: unknown, yRaw: unknown): { month: number; year: number } {
  const now = new Date();
  let month: number | null = null;
  let year: number | null = null;

  // Month
  if (mRaw instanceof Date && !isNaN(mRaw.getTime())) {
    month = mRaw.getMonth() + 1;
    year = mRaw.getFullYear();
  } else if (typeof mRaw === "number") {
    if (mRaw >= 1 && mRaw <= 12) month = Math.round(mRaw);
    else if (mRaw > 12) {
      const d = XLSX.SSF.parse_date_code(mRaw);
      if (d) { month = d.m; year = d.y; }
    }
  } else if (mRaw != null && String(mRaw).trim()) {
    const s = String(mRaw).trim();
    month = monthFromText(s);
    if (!month) {
      const num = parseInt(s, 10);
      if (num >= 1 && num <= 12) month = num;
    }
    const y = s.match(/(20\d{2}|19\d{2})/);
    if (y) year = Number(y[1]);
    else {
      const y2 = s.match(/[-\s/'](\d{2})$/);
      if (y2 && month) year = 2000 + Number(y2[1]);
    }
  }

  // Year
  if (yRaw instanceof Date && !isNaN(yRaw.getTime())) year = yRaw.getFullYear();
  else if (yRaw != null && String(yRaw).trim()) {
    const n = parseInt(String(yRaw).replace(/\D/g, ""), 10);
    if (n >= 1900 && n <= 2200) year = n;
    else if (n >= 0 && n < 100) year = 2000 + n;
  }

  return {
    month: month ?? now.getMonth() + 1,
    year: year ?? now.getFullYear(),
  };
}

/* ------------------------------------------------------------------ */
/* Column detection                                                    */
/* ------------------------------------------------------------------ */

type Field = "month" | "year" | "company" | "product" | "model" | "cash" | "installment" | "fix" | "remarks";

function detectField(header: string): Field | null {
  const h = norm(header);
  if (!h) return null;
  if (h.includes("cash")) return "cash";
  if (h.includes("instal") || h.includes("qist") || h.includes("lease")) return "installment";
  if (h.includes("fix")) return "fix";
  if (h.includes("remark") || h.includes("note") || h.includes("comment")) return "remarks";
  if (h.includes("month")) return "month";
  if (h.includes("year")) return "year";
  if (h.includes("company") || h.includes("brand") || h.includes("make")) return "company";
  if (h.includes("product") || h.includes("category") || h.includes("item") || h === "type") return "product";
  if (h.includes("model")) return "model";
  if (h === "date" || h === "period") return "month";
  return null;
}

export function rowsFromWorkbook(wb: XLSX.WorkBook): RateItem[] {
  const out: RateItem[] = [];
  let idx = 0;
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true });
    if (!rows.length) continue;

    // Find header row (first row in first 10 that contains a "model" column)
    let headerRow = -1;
    let map: Partial<Record<Field, number>> = {};
    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const m: Partial<Record<Field, number>> = {};
      (rows[r] || []).forEach((cell, c) => {
        const f = detectField(String(cell ?? ""));
        if (f && m[f] === undefined) m[f] = c;
      });
      if (m.model !== undefined) { headerRow = r; map = m; break; }
    }
    if (headerRow < 0) continue;

    const get = (row: unknown[], f: Field) => (map[f] !== undefined ? row[map[f]!] : null);

    for (let r = headerRow + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const model = String(get(row, "model") ?? "").trim();
      if (!model) continue;
      const company = String(get(row, "company") ?? "").trim() || (wb.SheetNames.length > 1 ? sheetName : "Other");
      const product = String(get(row, "product") ?? "").trim() || "General";
      const remarks = String(get(row, "remarks") ?? "").trim();
      const { month, year } = parseMonthYear(get(row, "month"), get(row, "year"));
      out.push(makeItem({
        id: `r${idx++}`,
        company: titleCase(company),
        product: titleCase(product),
        model,
        cash: parseRate(get(row, "cash")),
        installment: parseRate(get(row, "installment")),
        fix: parseRate(get(row, "fix")),
        remarks,
        month,
        year,
      }));
    }
  }
  return out;
}

function titleCase(s: string) {
  // Keep short all-caps brand names (LG, TCL, PEL) as they are
  if (s.length <= 4 && s === s.toUpperCase()) return s;
  return s.replace(/\s+/g, " ").replace(/\w\S*/g, (w) =>
    w.length <= 3 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  );
}

function makeItem(p: Omit<RateItem, "period" | "nModel" | "nAll">): RateItem {
  return {
    ...p,
    period: p.year * 12 + p.month,
    nModel: norm(p.model),
    nAll: norm(`${p.company} ${p.product} ${p.model} ${p.remarks}`),
  };
}

/** Keep only the most recent rate for each Company + Model */
export function latestOnly(items: RateItem[]): RateItem[] {
  const map = new Map<string, RateItem>();
  for (const it of items) {
    const key = norm(it.company) + "|" + it.nModel;
    const prev = map.get(key);
    if (!prev || it.period >= prev.period) map.set(key, it);
  }
  return Array.from(map.values());
}

/* ------------------------------------------------------------------ */
/* Fuzzy search                                                        */
/* ------------------------------------------------------------------ */

function isSubsequence(q: string, s: string) {
  let i = 0;
  for (let j = 0; j < s.length && i < q.length; j++) if (q[i] === s[j]) i++;
  return i === q.length;
}

function lev(a: string, b: string) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Returns 0 when no match, higher = better */
export function searchScore(item: RateItem, query: string): number {
  const q = norm(query);
  if (!q) return 1;
  if (item.nModel === q) return 200;
  if (item.nModel.startsWith(q)) return 150;
  if (item.nModel.includes(q)) return 120;
  if (item.nAll.includes(q)) return 90;

  const tokens = query.split(/[\s\-_/.,+]+/).map(norm).filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => item.nAll.includes(t))) return 75;

  if (q.length >= 3) {
    // close typo: compare against windows of the model
    const maxDist = q.length >= 7 ? 2 : 1;
    const s = item.nModel;
    for (let len = q.length - 1; len <= q.length + 1; len++) {
      if (len <= 0 || len > s.length) continue;
      for (let i = 0; i + len <= s.length; i++) {
        if (lev(q, s.slice(i, i + len)) <= maxDist) return 55;
      }
    }
    if (q.length >= 4 && isSubsequence(q, item.nModel)) return 40;
    if (q.length >= 5 && isSubsequence(q, item.nAll)) return 20;
  }
  return 0;
}

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

export interface LoadResult {
  items: RateItem[];
  source: "xlsx" | "csv" | "sample";
}

async function tryFetch(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 10) return null;
    // Dev servers / SPA hosts may return index.html for missing files
    const head = new TextDecoder().decode(buf.slice(0, 64)).trim().toLowerCase();
    if (head.startsWith("<!doctype") || head.startsWith("<html")) return null;
    return buf;
  } catch {
    return null;
  }
}

export async function loadRates(): Promise<LoadResult> {
  const files: { name: string; type: "xlsx" | "csv" }[] = [
    { name: "rates.xlsx", type: "xlsx" },
    { name: "Rates.xlsx", type: "xlsx" },
    { name: "rates.csv", type: "csv" },
  ];
  for (const f of files) {
    const buf = await tryFetch(f.name);
    if (!buf) continue;
    try {
      const wb =
        f.type === "csv"
          ? XLSX.read(new TextDecoder().decode(buf), { type: "string", cellDates: true })
          : XLSX.read(buf, { type: "array", cellDates: true });
      const items = rowsFromWorkbook(wb);
      if (items.length) return { items, source: f.type };
    } catch (e) {
      console.error("Failed to parse", f.name, e);
    }
  }
  return { items: sampleData(), source: "sample" };
}

/* ------------------------------------------------------------------ */
/* Sample data (shown only when rates.xlsx is not found)               */
/* ------------------------------------------------------------------ */

function sampleData(): RateItem[] {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const raw: [string, string, string, number, number, number | null, string][] = [
    ["Haier", "Refrigerator", "HRF-336 EBD", 128500, 152000, 139000, "Free delivery in city limits"],
    ["Haier", "Refrigerator", "HRF-398 IDB", 156000, 184500, 168000, ""],
    ["Haier", "Air Conditioner", "HSU-12HFAB DC Inverter", 172000, 205000, 186500, "Installation charges extra"],
    ["Haier", "LED TV", "H43K800FX 43\" Android", 89500, 106000, 96000, ""],
    ["Haier", "Washing Machine", "HWM 120-AS Twin Tub", 42500, 51000, 46000, "Limited stock"],
    ["Haier", "Deep Freezer", "HDF-405 INV", 118000, 140000, 127500, ""],
    ["Dawlance", "Refrigerator", "9193 LF Avante+", 132000, 158000, null, ""],
    ["Dawlance", "Air Conditioner", "Chrome Pro 30 Inverter 1.5 Ton", 168500, 199000, null, "New model"],
    ["Dawlance", "Microwave", "DW-295 HP", 33500, 40000, null, ""],
    ["Dawlance", "Deep Freezer", "DF-400 Inverter", 112000, 133000, null, ""],
    ["Orient", "Refrigerator", "Grand 465 Inverter", 149000, 176500, null, ""],
    ["Orient", "Air Conditioner", "Ultron Plus 1.5 Ton", 162000, 192000, null, "Price valid till stock lasts"],
    ["Orient", "Water Dispenser", "OWD-531 Icon", 38500, 46000, null, ""],
    ["Gree", "Air Conditioner", "GS-18FITH6G Pular", 205000, 242000, null, ""],
    ["Gree", "Air Conditioner", "GS-12CITH11G Fairy", 158000, 187500, null, ""],
    ["PEL", "Refrigerator", "PRINVOGLAM-20250", 118500, 140000, null, ""],
    ["PEL", "Air Conditioner", "PINVO-1.5 Ton InverterOn", 149500, 177000, null, ""],
    ["Samsung", "LED TV", "UA55DU7000 55\" Crystal 4K", 185000, 219000, null, "Official warranty"],
    ["Samsung", "Washing Machine", "WW90T4040CE Front Load", 198000, 234000, null, ""],
    ["LG", "Refrigerator", "GL-C402RLCN", 165000, 195000, null, ""],
    ["LG", "Air Conditioner", "S4-Q12JA3AE Dual Inverter", 189000, 223500, null, ""],
    ["TCL", "LED TV", "50P635 50\" 4K Google TV", 112000, 132500, null, ""],
    ["TCL", "Air Conditioner", "TAC-12T3 1 Ton Inverter", 128000, 151000, null, ""],
    ["Kenwood", "Air Conditioner", "KES-1840S eSmart 1.5 Ton", 176000, 208000, null, ""],
    ["Super Asia", "Washing Machine", "SA-244 Twin Tub", 36500, 43500, null, ""],
  ];
  return raw.map(([company, product, model, cash, inst, fix, remarks], i) =>
    makeItem({ id: `s${i}`, company, product, model, cash, installment: inst, fix, remarks, month: m, year: y })
  );
}
