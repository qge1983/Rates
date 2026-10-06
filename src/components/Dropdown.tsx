import { useEffect, useRef, useState } from "react";

export interface Option {
  value: string;
  label: string;
  count: number;
}

interface Props {
  label: string;
  allLabel: string;
  value: string;
  options: Option[];
  totalCount: number;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onChange: (v: string) => void;
  icon: React.ReactNode;
}

/**
 * The panel is absolutely positioned against the nearest `relative` ancestor
 * (the filter row) so it overlays the page content smoothly.
 */
export default function Dropdown({
  label, allLabel, value, options, totalCount, open, onToggle, onClose, onChange, icon,
}: Props) {
  const [q, setQ] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setQ("");
    else listRef.current?.scrollTo({ top: 0 });
  }, [open]);

  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().replace(/[^a-z0-9]/g, "").includes(q.toLowerCase().replace(/[^a-z0-9]/g, "")))
    : options;

  const selected = value ? options.find((o) => o.value === value)?.label ?? value : "";

  const pick = (v: string) => {
    onChange(v);
    onClose();
  };

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={`group flex w-full min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
          open
            ? "border-red-500 bg-white ring-4 ring-red-500/10"
            : value
            ? "border-red-200 bg-red-50/70"
            : "border-neutral-200 bg-white hover:border-neutral-300"
        }`}
      >
        <span className={`shrink-0 ${value || open ? "text-red-600" : "text-neutral-400"}`}>{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase leading-none tracking-wider text-neutral-400">
            {label}
          </span>
          <span className={`mt-1 block truncate text-sm font-semibold leading-tight ${value ? "text-red-700" : "text-neutral-800"}`}>
            {selected || allLabel}
          </span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${open ? "rotate-180 text-red-600" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="animate-pop absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_24px_50px_-12px_rgba(0,0,0,0.28)]">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Select {label}</span>
            <button onClick={onClose} className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" aria-label="Close">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {options.length > 7 && (
            <div className="border-b border-neutral-100 p-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Find ${label.toLowerCase()}…`}
                className="w-full rounded-lg bg-neutral-100 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-red-500/30"
              />
            </div>
          )}
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto overscroll-contain p-1.5">
            {!q && (
              <OptionRow active={!value} label={allLabel} count={totalCount} onClick={() => pick("")} />
            )}
            {filtered.map((o) => (
              <OptionRow key={o.value} active={value === o.value} label={o.label} count={o.count} onClick={() => pick(o.value)} />
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-neutral-400">No match found</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function OptionRow({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
        active ? "bg-red-600 text-white" : "text-neutral-700 hover:bg-red-50 hover:text-red-700"
      }`}
    >
      <span className="flex items-center gap-2 font-medium truncate">
        {active && (
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        <span className="truncate">{label}</span>
      </span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${active ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"}`}>
        {count}
      </span>
    </button>
  );
}
