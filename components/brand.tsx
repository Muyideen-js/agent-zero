import clsx from "clsx";

/** Agent Zero mark: a slashed zero on a solid tile, the slash ending in an agent node. */
export function Mark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--fg)" />
      <circle cx="16" cy="16" r="7.25" stroke="var(--bg)" strokeWidth="2.75" />
      <path d="M10.6 21.4 20.4 11.6" stroke="var(--bg)" strokeWidth="2.75" strokeLinecap="round" />
      <circle cx="21.6" cy="10.4" r="2.6" fill="var(--accent)" stroke="var(--fg)" strokeWidth="1.2" />
    </svg>
  );
}

export function Logo({ className, size = 26 }: { className?: string; size?: number }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <Mark size={size} />
      <span className="font-display text-[16px] font-semibold tracking-[-0.022em]">Agent Zero</span>
    </span>
  );
}

const palettes = [
  ["#00e29a", "#0b5c45"],
  ["#7aa2ff", "#24357a"],
  ["#ffb35c", "#7a3e0c"],
  ["#ff7ab6", "#6e1b44"],
  ["#b48cff", "#3f2382"],
];

/** Flat monogram tile, colour picked deterministically from the company name. */
export function CompanyAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const h = [...name].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const color = palettes[h % palettes.length][0];
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center font-display font-bold"
      style={{ width: size, height: size, borderRadius: size * 0.28, fontSize: size * 0.44, color, background: `${color}14`, boxShadow: `inset 0 0 0 1px ${color}40` }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase() || "A"}
    </span>
  );
}

const NEAR_PATH =
  "M18.15 3.86 14.4 9.43a.4.4 0 0 0 .59.52l3.69-3.2a.15.15 0 0 1 .25.11v10.03a.15.15 0 0 1-.27.1L7.5 3.82A2.1 2.1 0 0 0 5.9 3.07h-.34A2.06 2.06 0 0 0 3.5 5.13v13.74a2.06 2.06 0 0 0 3.82 1.07l3.75-5.57a.4.4 0 0 0-.59-.52l-3.69 3.2a.15.15 0 0 1-.25-.11V6.92a.15.15 0 0 1 .27-.1L17.95 20.18a2.1 2.1 0 0 0 1.6.75h.34a2.06 2.06 0 0 0 2.06-2.06V5.13a2.06 2.06 0 0 0-3.8-1.27Z";

/** NEAR Protocol logomark. Sized in px, or in em when size is omitted. */
export function NearMark({ size, className }: { size?: number; className?: string }) {
  const s = size ? { width: size, height: size } : { width: "0.8em", height: "0.8em" };
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={s} className={clsx("inline-block shrink-0", className)} aria-hidden>
      <path d={NEAR_PATH} />
    </svg>
  );
}

/** Amount followed by the NEAR mark. */
export function Amt({ v, d = 2, sign = "", className }: { v: number; d?: number; sign?: string; className?: string }) {
  return (
    <span className={clsx("num inline-flex items-center gap-[0.28em] whitespace-nowrap", className)}>
      <span>
        {sign}
        {v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}
      </span>
      <NearMark className="opacity-50" />
      <span className="sr-only"> NEAR</span>
    </span>
  );
}
