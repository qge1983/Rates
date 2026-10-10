import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Login from "./components/Login";
import Logo from "./components/Logo";
import Dropdown, { type Option } from "./components/Dropdown";
import RateCard, { shareText } from "./components/RateCard";
import { formatRate, isHaier, latestOnly, loadRates, MONTHS, norm, searchScore, type LoadResult, type RateItem, type RateValue } from "./lib/rates";

const AUTH_KEY = "qge_auth_v1";
const PAGE = 48;

type SortKey = "az" | "low" | "high";
const SORT_LABEL: Record<SortKey, string> = { az: "A – Z", low: "Price ↑", high: "Price ↓" };

function isAuthed() {
  return localStorage.getItem(AUTH_KEY) === "1" || sessionStorage.getItem(AUTH_KEY) === "1";
}

const num = (v: RateValue) => (typeof v === "number" ? v : Number.POSITIVE_INFINITY);

export default function App() {
  const [authed, setAuthed] = useState(isAuthed);

  const login = (remember: boolean) => {
    (remember ? localStorage : sessionStorage).setItem(AUTH_KEY, "1");
    setAuthed(true);
  };
  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
    setAuthed(false);
  };

  if (!authed) return <Login onLogin={login} />;
  return <Portal onLogout={logout} />;
}

function Portal({ onLogout }: { onLogout: () => void }) {
  const [data, setData] = useState<LoadResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("");
  const [product, setProduct] = useState("");
  const [openDD, setOpenDD] = useState<"" | "company" | "product">("");
  const [sort, setSort] = useState<SortKey>("az");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [headerHidden, setHeaderHidden] = useState(false);
  const [topH, setTopH] = useState(170);
  const [limit, setLimit] = useState(PAGE);
  const [toast, setToast] = useState("");
  const [showTop, setShowTop] = useState(false);

  const topRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  /* ---------- Load data ---------- */
  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await loadRates();
      setData(res);
    } catch (error) {
      console.error("Unable to load rates", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  /* ---------- Header hide on scroll ---------- */
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 40) setHeaderHidden(false);
        else if (y > last + 6) setHeaderHidden(true);
        else if (y < last - 6) setHeaderHidden(false);
        setShowTop(y > 600);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ---------- Measure fixed top area ---------- */
  useLayoutEffect(() => {
    if (!topRef.current) return;
    const ro = new ResizeObserver(() => setTopH(topRef.current?.offsetHeight ?? 170));
    ro.observe(topRef.current);
    return () => ro.disconnect();
  }, []);

  /* ---------- Escape closes dropdown ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenDD("");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- Derived data ---------- */
  const items = useMemo(() => (data ? latestOnly(data.items) : []), [data]);
  const latestPeriod = useMemo(() => items.reduce((m, i) => Math.max(m, i.period), 0), [items]);
  const latestLabel = latestPeriod
    ? `${MONTHS[(latestPeriod - 1) % 12]} ${Math.floor((latestPeriod - 1) / 12)}`
    : "";

  const searched = useMemo(() => {
    if (!query.trim()) return items.map((i) => ({ i, s: 1 }));
    return items.map((i) => ({ i, s: searchScore(i, query) })).filter((x) => x.s > 0);
  }, [items, query]);

  const companyOptions: Option[] = useMemo(() => {
    const m = new Map<string, Option>();
    for (const { i } of searched) {
      if (product && norm(i.product) !== product) continue;
      const k = norm(i.company);
      const o = m.get(k) ?? { value: k, label: i.company, count: 0 };
      o.count++;
      m.set(k, o);
    }
    return [...m.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [searched, product]);

  const productOptions: Option[] = useMemo(() => {
    const m = new Map<string, Option>();
    for (const { i } of searched) {
      if (company && norm(i.company) !== company) continue;
      const k = norm(i.product);
      const o = m.get(k) ?? { value: k, label: i.product, count: 0 };
      o.count++;
      m.set(k, o);
    }
    return [...m.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [searched, company]);

  const results: RateItem[] = useMemo(() => {
    const list = searched.filter(
      ({ i }) => (!company || norm(i.company) === company) && (!product || norm(i.product) === product)
    );
    list.sort((a, b) => {
      if (query.trim() && b.s !== a.s) return b.s - a.s;
      if (sort === "low") return num(a.i.cash) - num(b.i.cash);
      if (sort === "high") {
        const av = typeof a.i.cash === "number" ? a.i.cash : -1;
        const bv = typeof b.i.cash === "number" ? b.i.cash : -1;
        return bv - av;
      }
      return (
        a.i.company.localeCompare(b.i.company) ||
        a.i.product.localeCompare(b.i.product) ||
        a.i.model.localeCompare(b.i.model, undefined, { numeric: true })
      );
    });
    return list.map((x) => x.i);
  }, [searched, company, product, sort, query]);

  // Reset paging on filter change
  useEffect(() => setLimit(PAGE), [query, company, product, sort]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) setLimit((l) => l + PAGE);
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [results.length, viewMode]);

  const totalForCompanyDD = companyOptions.reduce((s, o) => s + o.count, 0);
  const totalForProductDD = productOptions.reduce((s, o) => s + o.count, 0);
  const hasFilters = !!(query || company || product);

  const clearAll = () => { setQuery(""); setCompany(""); setProduct(""); };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Rate copied to clipboard");
    } catch {
      showToast("Unable to copy");
    }
  };
  const showToast = (t: string) => {
    setToast(t);
    window.clearTimeout((showToast as unknown as { _t?: number })._t);
    (showToast as unknown as { _t?: number })._t = window.setTimeout(() => setToast(""), 1800);
  };

  const headerH = headerRef.current?.offsetHeight ?? 56;

  return (
    <div className="min-h-[100dvh] bg-[#f5f5f6] text-neutral-900">
      {/* ================= FIXED TOP (header + search) ================= */}
      <div
        ref={topRef}
        className="fixed inset-x-0 top-0 z-40 transition-transform duration-300 ease-out will-change-transform"
        style={{ transform: headerHidden ? `translateY(-${headerH}px)` : "translateY(0)" }}
      >
        {/* Header */}
        <header ref={headerRef} className="bg-white">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <Logo className="h-9 w-9 shrink-0" />
              <div className="min-w-0 leading-none">
                <div className="truncate text-[15px] font-extrabold tracking-tight">
                  QAISER GROUP <span className="text-red-600">OF ELECTRONICS</span>
                </div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Salesman Rate Portal
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={refresh}
                title="Refresh rates"
                aria-label="Refresh rates"
                disabled={loading}
                className="min-h-10 min-w-10 rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-red-600 disabled:cursor-wait disabled:opacity-60"
              >
                <svg className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={onLogout}
                title="Logout"
                className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
          <div className="h-[3px] bg-gradient-to-r from-red-600 via-red-500 to-neutral-900" />
        </header>

        {/* Search + filters */}
        <div className="border-b border-neutral-200/80 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 pb-3 pt-3">
            <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 transition focus-within:border-red-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-red-500/10">
              <svg className="h-5 w-5 shrink-0 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setOpenDD("")}
                placeholder="Search model, company or product…"
                aria-label="Search model, company or product"
                className="w-full bg-transparent py-3 text-[15px] outline-none placeholder:text-neutral-400"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="shrink-0 rounded-full bg-neutral-200 p-1 text-neutral-600 transition hover:bg-red-600 hover:text-white"
                  aria-label="Clear search"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Two dropdowns in one line */}
            <div className="relative mt-2.5 grid grid-cols-2 gap-2.5">
              <Dropdown
                label="Company"
                allLabel="All Companies"
                value={company}
                options={companyOptions}
                totalCount={totalForCompanyDD}
                open={openDD === "company"}
                onToggle={() => setOpenDD((o) => (o === "company" ? "" : "company"))}
                onClose={() => setOpenDD("")}
                onChange={(v) => { setCompany(v); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                }
              />
              <Dropdown
                label="Product"
                allLabel="All Products"
                value={product}
                options={productOptions}
                totalCount={totalForProductDD}
                open={openDD === "product"}
                onToggle={() => setOpenDD((o) => (o === "product" ? "" : "product"))}
                onClose={() => setOpenDD("")}
                onChange={(v) => { setProduct(v); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dim backdrop while a dropdown is open */}
      {openDD && (
        <div className="animate-fade fixed inset-0 z-30 bg-neutral-900/25 backdrop-blur-[1px]" onClick={() => setOpenDD("")} />
      )}

      {/* ================= CONTENT ================= */}
      <main className="mx-auto max-w-6xl px-4 pb-16" style={{ paddingTop: topH + 14 }}>
        {/* Info strip */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {latestLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-sm shadow-red-600/30">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                Rates: {latestLabel}
              </span>
            )}
            <span className="text-xs font-semibold text-neutral-500">
              {loading ? "Loading…" : `${results.length} model${results.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button
                onClick={clearAll}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-600 transition hover:border-red-300 hover:text-red-600"
              >
                Clear all
              </button>
            )}
            <label className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700">
              <span className="text-neutral-400">Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="max-w-[132px] bg-transparent py-0.5 outline-none focus:text-red-700" aria-label="Sort rates">
                <option value="az">A–Z</option>
                <option value="low">Lowest cash</option>
                <option value="high">Highest cash</option>
              </select>
            </label>
            <div className="inline-flex rounded-full border border-neutral-200 bg-white p-0.5" role="group" aria-label="Result layout">
              <button onClick={() => setViewMode("cards")} aria-pressed={viewMode === "cards"} className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${viewMode === "cards" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}>Cards</button>
              <button onClick={() => setViewMode("list")} aria-pressed={viewMode === "list"} className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${viewMode === "list" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}>List</button>
            </div>
          </div>
        </div>

        {(query || company || product) && (
          <div className="mb-3 flex flex-wrap items-center gap-2" aria-label="Active filters">
            <span className="text-xs font-semibold text-neutral-500">Filters:</span>
            {query && <button onClick={() => setQuery("")} className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Search: {query}<span aria-hidden="true">×</span></button>}
            {company && <button onClick={() => setCompany("")} className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">{companyOptions.find(o => o.value === company)?.label ?? company}<span aria-hidden="true">×</span></button>}
            {product && <button onClick={() => setProduct("")} className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">{productOptions.find(o => o.value === product)?.label ?? product}<span aria-hidden="true">×</span></button>}
          </div>
        )}

        {productOptions.length > 1 && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Quick product filters">
            <button onClick={() => setProduct("")} className={`min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-bold transition ${!product ? "border-red-600 bg-red-600 text-white" : "border-neutral-200 bg-white text-neutral-600 hover:border-red-300"}`}>All products</button>
            {productOptions.slice(0, 8).map((o) => <button key={o.value} onClick={() => setProduct(product === o.value ? "" : o.value)} className={`min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-bold transition ${product === o.value ? "border-red-600 bg-red-600 text-white" : "border-neutral-200 bg-white text-neutral-600 hover:border-red-300"}`}>{o.label}</button>)}
          </div>
        )}

        {data?.source === "sample" && !loading && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
            <div><b>Demo data shown.</b> Upload <code className="rounded bg-amber-100 px-1">rates.xlsx</code> to your GitHub repository (next to index.html) for live rates. Do not quote demo prices.</div>
            <button onClick={refresh} className="min-h-9 shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100">Retry loading</button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-white ring-1 ring-neutral-200/70">
                <div className="m-4 h-4 w-24 rounded bg-neutral-200" />
                <div className="mx-4 h-6 w-40 rounded bg-neutral-200" />
                <div className="m-4 grid grid-cols-2 gap-2">
                  <div className="h-14 rounded-xl bg-neutral-100" />
                  <div className="h-14 rounded-xl bg-neutral-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {loadError && !loading && !data && (
          <div role="alert" className="mb-4 flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="font-bold text-neutral-900">Rates could not be loaded</h3><p className="mt-1 text-sm text-neutral-500">Check your connection and try again. Your existing rate data has not been changed.</p></div>
            <button onClick={refresh} className="min-h-10 shrink-0 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700">Try again</button>
          </div>
        )}

        {/* Results */}
        {!loading || data ? (
          results.length > 0 ? (
            <>
              {viewMode === "cards" ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {results.slice(0, limit).map((it) => <RateCard key={it.id} item={it} latestPeriod={latestPeriod} onCopy={copy} />)}
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                      <thead className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-500">
                        <tr><th className="px-4 py-3 font-bold">Company / Product</th><th className="px-4 py-3 font-bold">Model</th><th className="px-4 py-3 text-right font-bold">Cash</th><th className="px-4 py-3 text-right font-bold">Installment</th><th className="px-4 py-3 text-right font-bold">Fix Rate</th><th className="px-4 py-3 text-right font-bold">Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {results.slice(0, limit).map((it) => (
                          <tr key={it.id} className="transition hover:bg-red-50/40">
                            <td className="px-4 py-3"><div className="font-bold text-neutral-800">{it.company}</div><div className="mt-0.5 text-xs text-neutral-500">{it.product}</div></td>
                            <td className="max-w-[260px] whitespace-normal px-4 py-3 font-semibold text-neutral-900">{it.model}<div className="mt-1 text-[11px] font-medium text-neutral-400">{it.month ? `${MONTHS[it.month - 1]} ${it.year}` : ""}</div></td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-extrabold tabular-nums text-red-700">{formatRate(it.cash)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums text-neutral-800">{formatRate(it.installment)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums text-neutral-700">{isHaier(it.company) ? formatRate(it.fix) : "—"}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right"><div className="inline-flex items-center gap-2"><button onClick={() => copy(shareText(it))} className="min-h-9 rounded-lg border border-neutral-200 px-3 text-xs font-bold text-neutral-700 hover:border-red-300 hover:text-red-700" aria-label={`Copy ${it.model} rate`}>Copy</button><a href={`https://wa.me/?text=${encodeURIComponent(shareText(it))}`} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center rounded-lg bg-green-50 px-3 text-xs font-bold text-green-700 hover:bg-green-100" aria-label={`Share ${it.model} on WhatsApp`}>WhatsApp</a></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-neutral-100 px-4 py-2 text-xs text-neutral-500">Scroll horizontally to view all price columns on smaller screens.</div>
                </div>
              )}
              {limit < results.length && <div ref={sentinel} className="h-10" />}
            </>
          ) : (
            data && (
              <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-neutral-200/70">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0zM8 10.5h5" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-bold">No rates found</h3>
                <p className="mt-1 max-w-xs text-sm text-neutral-500">
                  Try a shorter model number or different filters. Spaces, dashes and underscores are ignored.
                </p>
                <button
                  onClick={clearAll}
                  className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700"
                >
                  Clear search & filters
                </button>
              </div>
            )
          )
        ) : null}

        <footer className="mt-12 flex flex-col items-center gap-1 text-center text-xs text-neutral-400">
          <Logo className="h-8 w-8 opacity-80" />
          <span className="font-semibold text-neutral-500">Qaiser Group of Electronics · Since 1983</span>
          <span>Rates are subject to change. For internal sales use only.</span>
        </footer>
      </main>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-5 right-5 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white shadow-xl shadow-red-600/30 transition-all duration-300 hover:bg-red-700 ${
          showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
        aria-label="Back to top"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Toast */}
      <div
        className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-xl transition-all duration-300 ${
          toast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        {toast}
      </div>
    </div>
  );
}
