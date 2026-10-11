export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="accent-text text-[11px] font-semibold uppercase tracking-[0.18em]">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-[30px]">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
