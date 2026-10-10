import { useState } from "react";
import logoUrl from "../logo.png";

export function LogoSvg({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 400" className={className} aria-label="Qaiser Group of Electronics logo">
      {/* Red arc */}
      <path
        d="M82.1 271 A150 150 0 1 1 340.9 121.6"
        fill="none"
        stroke="#EE3B3F"
        strokeWidth="64"
      />
      {/* Red cross bar */}
      <path d="M84 152 L236 152 A27 27 0 0 1 236 206 L84 206 Z" fill="#EE3B3F" />
      {/* Black arc */}
      <path
        d="M346 133.7 A150 150 0 0 1 178.9 332.7"
        fill="none"
        stroke="#1A1A1A"
        strokeWidth="64"
      />
      {/* Black tail */}
      <path d="M58 312 C110 332 150 338 196 338 L196 364 C140 362 96 344 58 312 Z" fill="#1A1A1A" />
      {/* Band */}
      <rect x="168" y="322" width="232" height="66" rx="8" fill="#1A1A1A" />
      <text
        x="284"
        y="368"
        textAnchor="middle"
        fill="#fff"
        fontSize="36"
        fontWeight="800"
        fontFamily="'Oswald','Arial Narrow',Impact,sans-serif"
        textLength="196"
        lengthAdjust="spacingAndGlyphs"
      >
        SINCE 1983
      </text>
    </svg>
  );
}

/** Uses the repository's src/logo.png image, with an SVG fallback. */
export default function Logo({ className = "" }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <LogoSvg className={className} />;
  return (
    <img
      src={logoUrl}
      alt="Qaiser Group of Electronics"
      className={`${className} object-contain`}
      onError={() => setFailed(true)}
    />
  );
}
