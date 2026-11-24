/** Логотип TurMax: стилизованный тюндюк (верх юрты) + горный контур и словесный знак. */
export function Logo({ light = false, size = 30 }: { light?: boolean; size?: number }) {
  const main = light ? "#ffffff" : "#1d3a2c";
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="14.5" fill="none" stroke={main} strokeWidth="1.6" />
        <path d="M5 21 L12 12 L16.5 17 L20 13 L27 21" fill="none" stroke="#1fa8a0" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M9 7.5 L23 24.5 M23 7.5 L9 24.5" stroke={main} strokeWidth="1.1" opacity="0.55" />
      </svg>
      <span className="font-display text-[22px] leading-none font-semibold tracking-[-0.01em]" style={{ color: main }}>
        Tur<span className="text-turquoise-light">Max</span>
      </span>
    </span>
  );
}
