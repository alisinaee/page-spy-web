import { ReactNode, useState } from 'react';

export const DetailSection = ({
  label,
  action,
  children,
}: {
  label: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <section className="border-b border-border px-3 py-3 last:border-b-0">
    <div className="mb-1.5 flex min-h-6 items-center gap-2 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      {action}
    </div>
    {children}
  </section>
);

const HeaderRow = ({ name, value }: { name: string; value: string }) => {
  const [open, setOpen] = useState(false);
  const long = value.length > 96 || value.includes('\n');
  return (
    <button
      type="button"
      className="block w-full rounded-md py-0.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-expanded={long ? open : undefined}
      onClick={() => {
        if (long) setOpen((current) => !current);
      }}
    >
      <span className="font-semibold text-foreground">{name}: </span>
      <span
        className={
          open
            ? 'whitespace-pre-wrap break-all text-muted-foreground'
            : 'line-clamp-1 break-all text-muted-foreground'
        }
      >
        {value}
      </span>
    </button>
  );
};

export const KeyValueList = ({ data }: { data: [string, string][] }) => (
  <div className="space-y-1 font-mono text-xs md:text-sm">
    {data.map(([key, value], index) => (
      <HeaderRow
        key={`${key}-${index}`}
        name={key}
        value={String(value ?? '')}
      />
    ))}
  </div>
);
