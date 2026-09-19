export function SutraMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <ellipse cx="32" cy="38" rx="18" ry="20" fill="currentColor" opacity="0.95" />
      <circle cx="32" cy="22" r="12" fill="currentColor" />
      <circle cx="27" cy="21" r="2.2" fill="var(--color-bg)" />
      <circle cx="37" cy="21" r="2.2" fill="var(--color-bg)" />
    </svg>
  );
}
