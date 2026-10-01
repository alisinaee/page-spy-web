import { StorageType } from '@/store/platform-config';
import { SpyStorage } from '@huolala-tech/page-spy-types';
import { capitalize } from 'lodash-es';
import { formatTehranDateTime } from '@/utils/tehran';
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import copy from 'copy-to-clipboard';
import { cn } from '@/lib/utils';
import { message } from '@/utils/message';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { PanelEmpty, useIsDesktop } from '@/components/panel';

type Row = SpyStorage.Data;

interface ColumnDef {
  key: keyof Row;
  title: string;
  sorter?: (a: Row, b: Row) => number;
  render?: (val: any) => string;
}

const str = (v: unknown) => String(v ?? '');
const by = (key: keyof Row) => (a: Row, b: Row) =>
  str(a[key]).localeCompare(str(b[key]));

const defaultCols: ColumnDef[] = [
  { key: 'name', title: 'Name', sorter: by('name') },
  { key: 'value', title: 'Value', sorter: by('value') },
  { key: 'domain', title: 'Domain', sorter: by('domain') },
  { key: 'path', title: 'Path', sorter: by('path') },
  {
    key: 'expires',
    title: 'Expires',
    sorter: by('expires'),
    render: (v: string) => (v ? formatTehranDateTime(v) || v : 'Session'),
  },
  {
    key: 'secure',
    title: 'Secure',
    sorter: by('secure'),
    render: (v: boolean) => (v ? 'Yes' : ''),
  },
  {
    key: 'sameSite',
    title: 'SameSite',
    sorter: by('sameSite'),
    render: (v: string) => (v ? capitalize(v) : ''),
  },
  { key: 'partitioned', title: 'Partitioned', sorter: by('partitioned') },
];

const prettyValue = (value: unknown) => {
  const text = str(value);
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      return JSON.stringify(parsed, null, 2);
    }
  } catch (e) {
    // not JSON, show raw
  }
  return text;
};

const CopyButton = ({ text, label }: { text: string; label: string }) => (
  <Button
    variant="ghost"
    size="icon-touch"
    aria-label={label}
    className="md:size-8 md:min-h-0 md:min-w-0"
    onClick={() => {
      if (copy(text)) message.success('Copy success');
      else message.error('Copy failed');
    }}
  >
    <Copy />
  </Button>
);

/** Full key / value / metadata of one storage entry, for the DetailPane. */
export const StorageDetail = ({ row }: { row: Row }) => {
  const { t } = useTranslation();
  const { name, value, ...rest } = row;
  const pretty = useMemo(() => prettyValue(value), [value]);
  const meta = defaultCols.filter(
    (c) => c.key in rest && c.key !== 'name' && c.key !== 'value',
  );
  return (
    <div className="space-y-4 p-4">
      <section>
        <div className="flex items-center justify-between">
          <h4 className="text-xs text-muted-foreground">
            {t('storage.key', { defaultValue: 'Key' })}
          </h4>
          <CopyButton
            text={str(name)}
            label={t('storage.copy-key', { defaultValue: 'Copy key' })!}
          />
        </div>
        <p className="font-mono text-xs break-all md:text-sm">{str(name)}</p>
      </section>
      <section>
        <div className="flex items-center justify-between">
          <h4 className="text-xs text-muted-foreground">
            {t('storage.value', { defaultValue: 'Value' })}
          </h4>
          <CopyButton
            text={str(value)}
            label={t('storage.copy-value', { defaultValue: 'Copy value' })!}
          />
        </div>
        <pre className="font-mono text-xs break-all whitespace-pre-wrap md:text-sm">
          {pretty}
        </pre>
      </section>
      {meta.length > 0 && (
        <dl className="space-y-1 border-t border-border pt-3 text-xs md:text-sm">
          {meta.map((c) => (
            <div key={c.key} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{c.title}</dt>
              <dd className="font-mono break-all">
                {c.render
                  ? c.render(rest[c.key as keyof typeof rest])
                  : str(rest[c.key as keyof typeof rest])}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};

interface Props {
  activeTab: StorageType;
  storageMsg: Record<StorageType, SpyStorage.GetTypeDataItem['data']>;
  selected: Row | null;
  onSelect: (row: Row) => void;
}

export const StorageTable = ({
  activeTab,
  storageMsg,
  selected,
  onSelect,
}: Props) => {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const data = useMemo(
    () => Object.values(storageMsg[activeTab] || {}) as Row[],
    [activeTab, storageMsg],
  );

  const hasDetail = useMemo(() => {
    const { name, value, ...rest } = data[0] || ({} as Row);
    return Object.keys(rest).length > 0;
  }, [data]);

  const [sortKey, setSortKey] = useState<keyof Row | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const visibleCols = hasDetail ? defaultCols : defaultCols.slice(0, 2);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = visibleCols.find((c) => c.key === sortKey);
    if (!col?.sorter) return data;
    const sorted = [...data].sort(col.sorter);
    return sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [data, sortKey, sortOrder, visibleCols]);

  if (data.length === 0) {
    return (
      <PanelEmpty title={t('storage.no-data', { defaultValue: 'No data' })} />
    );
  }

  if (!isDesktop) {
    return (
      <ul>
        {sortedData.map((row, idx) => {
          const active = selected === row;
          return (
            <li key={row.name || idx}>
              <button
                type="button"
                onClick={() => onSelect(row)}
                className={cn(
                  'block min-h-11 w-full border-b border-border px-3 py-1.5 text-left hover:bg-muted/60',
                  active && 'border-l-2 border-l-primary bg-muted',
                )}
              >
                <span className="block truncate font-mono text-sm">
                  {str(row.name)}
                </span>
                <span className="block truncate font-mono text-xs text-muted-foreground">
                  {str(row.value)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Table className="table-fixed text-sm">
      <TableHeader className="sticky top-0 z-10 bg-background">
        <TableRow>
          {visibleCols.map((col) => (
            <TableHead key={col.key} className="h-9 text-muted-foreground">
              <button
                type="button"
                className="inline-flex items-center gap-1"
                onClick={() => {
                  if (sortKey === col.key) {
                    setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'));
                  } else {
                    setSortKey(col.key);
                    setSortOrder('asc');
                  }
                }}
              >
                {col.title}
                {sortKey === col.key &&
                  (sortOrder === 'asc' ? (
                    <ArrowUp className="size-3" />
                  ) : (
                    <ArrowDown className="size-3" />
                  ))}
              </button>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((row, idx) => (
          <TableRow
            key={row.name || idx}
            data-state={selected === row ? 'selected' : undefined}
            className={cn(
              'hover:bg-muted/60',
              selected === row && 'border-l-2 border-l-primary',
            )}
          >
            {visibleCols.map((col, i) => {
              const text = col.render
                ? col.render(row[col.key])
                : str(row[col.key]);
              return (
                <TableCell
                  key={col.key}
                  className="h-9 truncate p-0 font-mono text-sm"
                  title={text}
                >
                  {i === 0 ? (
                    <button
                      type="button"
                      className="block w-full truncate px-2 text-left"
                      onClick={() => onSelect(row)}
                    >
                      {text}
                    </button>
                  ) : (
                    <span className="block truncate px-2">{text}</span>
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
