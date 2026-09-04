type PageShellProps = Readonly<{
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  centered?: boolean;
  action?: React.ReactNode;
  wide?: boolean;
  variant?: 'default' | 'legal';
}>;

export function PageShell({ title, subtitle, children, centered = false, action, wide = false, variant = 'default' }: PageShellProps) {
  const hasHeader = Boolean(title || subtitle || action);
  const legal = variant === 'legal';
  const headerAlign = centered ? 'mx-auto max-w-3xl text-center' : '';
  const headerLayout = centered
    ? 'flex-col items-center'
    : 'flex-col items-start justify-between gap-5 md:flex-row md:items-end';
  const shellClass = legal
    ? 'ui-final mx-auto w-full max-w-[1200px] px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8'
    : `relative px-3 py-4 sm:px-5 sm:py-6 ${wide ? 'w-full 2xl:px-6' : 'mx-auto w-full max-w-[1280px]'}`;
  const headerClass = legal
    ? 'relative mb-8 flex pb-2 sm:mb-10'
    : 'ui-surface relative mb-6 flex p-5 sm:p-6';
  const titleClass = legal
    ? 'text-3xl font-black leading-tight text-ink [text-wrap:balance]'
    : 'text-3xl font-bold text-[var(--ui-text)] [text-wrap:balance]';
  const subtitleClass = legal
    ? 'mt-3 max-w-3xl text-sm font-medium leading-6 text-muted [text-wrap:pretty]'
    : 'mt-2 max-w-3xl text-sm leading-6 text-[var(--ui-text-muted)] [text-wrap:pretty]';

  return (
    <section className={shellClass}>
      {hasHeader ? (
        <header className={`${headerClass} ${headerLayout} ${headerAlign}`}>
          <div className="min-w-0">
            {title ? <h1 className={titleClass}>{title}</h1> : null}
            {subtitle ? <p className={subtitleClass}>{subtitle}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div className="relative">{children}</div>
    </section>
  );
}
