// Inline SVG logo — stacked config lines with an inspect ring on the last line.
// Renders the same in light/dark via currentColor.
export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-label="AI Config Analyzer logo"
      role="img"
      className={className}
      data-testid="img-logo"
    >
      <rect x="1" y="1" width="30" height="30" rx="7" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <path
        d="M7 10h18M7 16h13M7 22h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="22" cy="22" r="4" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
      <path d="M25 25l2.5 2.5" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2" data-testid="link-wordmark">
      <Logo size={size} />
      <span className="font-semibold tracking-tight text-base">
        AI Config <span className="text-primary">Analyzer</span>
      </span>
    </div>
  );
}
