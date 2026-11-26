// Decorative geometric illustrations for the four use cases. Identity colors only (charcoal, sage, ivory), no text, no claims.
const INK = "#20231f", SAGE = "#91a786", PALE = "#c5d4b9", IVORY = "#f5f4ee";
const common = { viewBox: "0 0 160 96", width: "100%", height: "100%", role: "presentation", "aria-hidden": true, focusable: false } as const;

export default function UseIllustration({ index }: { index: number }) {
  if (index === 0) return <svg {...common}>{/* business card with a tap wave */}
    <rect x="22" y="22" width="92" height="56" rx="8" fill={IVORY} stroke={INK} strokeWidth="2" />
    <circle cx="44" cy="44" r="9" fill={PALE} stroke={INK} strokeWidth="2" />
    <rect x="62" y="38" width="38" height="5" rx="2.5" fill={INK} /><rect x="62" y="50" width="26" height="5" rx="2.5" fill={SAGE} />
    <rect x="34" y="64" width="64" height="4" rx="2" fill={PALE} />
    <path d="M124 38c7 6 7 14 0 20M132 31c11 10 11 26 0 36" fill="none" stroke={SAGE} strokeWidth="3" strokeLinecap="round" /></svg>;
  if (index === 1) return <svg {...common}>{/* menu page with item rows */}
    <rect x="44" y="10" width="72" height="76" rx="8" fill={IVORY} stroke={INK} strokeWidth="2" />
    <rect x="54" y="20" width="30" height="6" rx="3" fill={INK} />
    {[36, 52, 68].map((y, i) => <g key={y}><rect x="54" y={y} width="14" height="10" rx="3" fill={i === 1 ? SAGE : PALE} /><rect x="74" y={y + 1} width="24" height="3.5" rx="1.75" fill={INK} /><rect x="74" y={y + 7} width="14" height="3" rx="1.5" fill={SAGE} /><rect x="102" y={y + 2} width="6" height="5" rx="2.5" fill={INK} /></g>)}</svg>;
  if (index === 2) return <svg {...common}>{/* storefront with awning */}
    <path d="M26 38h108l-8-22H34z" fill={PALE} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    <path d="M44 38v0M62 38c0 6-6 6-6 0M80 38c0 6-6 6-6 0M98 38c0 6-6 6-6 0M116 38c0 6-6 6-6 0" fill="none" stroke={INK} strokeWidth="2" />
    <rect x="32" y="40" width="96" height="42" fill={IVORY} stroke={INK} strokeWidth="2" />
    <rect x="68" y="52" width="24" height="30" rx="2" fill={SAGE} stroke={INK} strokeWidth="2" />
    <rect x="40" y="50" width="20" height="14" rx="2" fill={PALE} stroke={INK} strokeWidth="2" /><rect x="100" y="50" width="20" height="14" rx="2" fill={PALE} stroke={INK} strokeWidth="2" /></svg>;
  return <svg {...common}>{/* one code, changing destination */}
    <rect x="16" y="30" width="36" height="36" rx="6" fill={IVORY} stroke={INK} strokeWidth="2" />
    {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => (r + c) % 2 === 0 ? <rect key={r + "-" + c} x={23 + c * 9} y={37 + r * 9} width="6" height="6" rx="1" fill={INK} /> : null))}
    <path d="M58 48h24" stroke={INK} strokeWidth="2.5" strokeLinecap="round" /><path d="M76 42l7 6-7 6" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="92" y="14" width="52" height="28" rx="6" fill={PALE} stroke={INK} strokeWidth="2" /><rect x="92" y="54" width="52" height="28" rx="6" fill={IVORY} stroke={INK} strokeWidth="2" strokeDasharray="5 4" />
    <rect x="100" y="23" width="28" height="4" rx="2" fill={INK} /><rect x="100" y="31" width="18" height="3.5" rx="1.75" fill={SAGE} /><rect x="100" y="63" width="28" height="4" rx="2" fill={SAGE} /><rect x="100" y="71" width="18" height="3.5" rx="1.75" fill={PALE} /></svg>;
}
