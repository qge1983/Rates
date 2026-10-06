import { formatRate, isHaier, periodLabel, type RateItem } from "../lib/rates";

interface Props {
  item: RateItem;
  latestPeriod: number;
  onCopy: (text: string) => void;
}

export function shareText(item: RateItem) {
  const haier = isHaier(item.company);
  const lines = [
    `*Qaiser Group of Electronics*`,
    `${item.company} · ${item.product}`,
    `Model: *${item.model}*`,
    `Cash: ${formatRate(item.cash)}`,
    `Installment: ${formatRate(item.installment)}`,
  ];
  if (haier) lines.push(`Fix Rate: ${formatRate(item.fix)}`);
  if (item.remarks) lines.push(`Remarks: ${item.remarks}`);
  lines.push(`Rates: ${periodLabel(item.month, item.year)}`);
  return lines.join("\n");
}

export default function RateCard({ item, latestPeriod, onCopy }: Props) {
  const haier = isHaier(item.company);
  const isOld = item.period < latestPeriod;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_rgba(0,0,0,0.18)] hover:ring-red-200">
      {/* Accent bar */}
      <div className={`h-1 w-full ${haier ? "bg-gradient-to-r from-red-600 via-red-500 to-neutral-900" : "bg-gradient-to-r from-red-500 to-red-400"}`} />

      <div className="flex flex-1 flex-col p-4">
        {/* Top meta */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${haier ? "bg-neutral-900 text-white" : "bg-red-600 text-white"}`}>
              {item.company}
            </span>
            <span className="truncate rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
              {item.product}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => onCopy(shareText(item))}
              title="Copy rate"
              className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-800"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText(item))}`}
              target="_blank"
              rel="noreferrer"
              title="Share on WhatsApp"
              className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-green-50 hover:text-green-600"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.63.71.23 1.36.2 1.88.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 01-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.43 9.43 0 01-1.45-5.03c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.9.99 6.68 2.77a9.38 9.38 0 012.76 6.68c0 5.2-4.24 9.44-9.45 9.44zm8.04-17.48A11.3 11.3 0 0012.05.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.6 23.6l6.01-1.58a11.34 11.34 0 005.43 1.38h.01c6.26 0 11.36-5.1 11.36-11.36 0-3.03-1.18-5.89-3.32-8.03z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Model */}
        <h3 className="mt-3 break-words text-lg font-extrabold leading-snug tracking-tight text-neutral-900">
          {item.model}
        </h3>

        {/* Rates */}
        <div className={`mt-3 grid gap-2 ${haier ? "grid-cols-3" : "grid-cols-2"}`}>
          <RateBox label="Cash" value={formatRate(item.cash)} tone="red" />
          <RateBox label="Installment" value={formatRate(item.installment)} tone="dark" />
          {haier && <RateBox label="Fix Rate" value={formatRate(item.fix)} tone="solid" />}
        </div>

        {/* Remarks (only if present) */}
        {item.remarks && (
          <div className="mt-3 flex gap-2 rounded-xl border border-dashed border-red-200 bg-red-50/50 px-3 py-2">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[13px] font-medium leading-snug text-neutral-700">{item.remarks}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${isOld ? "text-amber-600" : "text-neutral-500"}`}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {periodLabel(item.month, item.year)}
            {isOld && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] uppercase">Previous</span>}
          </span>
          {!isOld && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-600">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Latest
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function RateBox({ label, value, tone }: { label: string; value: string; tone: "red" | "dark" | "solid" }) {
  const styles = {
    red: "bg-red-50 ring-1 ring-red-100 text-red-700",
    dark: "bg-neutral-900 text-white",
    solid: "bg-gradient-to-br from-red-600 to-red-500 text-white",
  }[tone];
  const labelStyle = tone === "red" ? "text-red-500/80" : "text-white/70";
  return (
    <div className={`rounded-xl px-2.5 py-2 ${styles}`}>
      <div className={`text-[10px] font-bold uppercase tracking-wider ${labelStyle}`}>{label}</div>
      <div className="mt-0.5 text-[15px] font-extrabold leading-tight tabular-nums sm:text-base break-words">{value}</div>
    </div>
  );
}
