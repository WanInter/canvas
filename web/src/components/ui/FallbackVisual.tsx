export function FallbackVisual({ className = '', children }: Readonly<{ className?: string; children?: React.ReactNode }>) {
  return <div className={`fallback-visual ${className}`}>{children}</div>;
}
