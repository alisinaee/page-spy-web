import { CSSProperties, ReactNode, useMemo, useState } from 'react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { formatTehranDateTime } from '@/utils/tehran';
import { useThrottle } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  FilterChip,
  PanelEmpty,
  SearchField,
  useIsDesktop,
} from '@/components/panel';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ColoredJson } from '../../ColoredJson';
import { useElementSize } from '../../useElementSize';

export interface MessageItem {
  id: string;
  data: string;
  timestamp: number;
  type?: 'send' | 'receive';
}

interface Props {
  type: 'websocket' | 'eventsource';
  data: MessageItem[];
  /** Leading cell (direction arrow, event id). */
  lead?: (item: MessageItem) => ReactNode;
  /** Extra cell shown on desktop only. */
  extra?: (item: MessageItem) => ReactNode;
}

interface RowData {
  items: MessageItem[];
  activeId?: string;
  onSelect: (item: MessageItem) => void;
  lead?: Props['lead'];
  extra?: Props['extra'];
}

const Row = ({ index, style, data }: ListChildComponentProps<RowData>) => {
  const { items, activeId, onSelect, lead, extra } = data;
  const item = items[index];
  const active = item.id === activeId;
  return (
    <button
      type="button"
      style={style as CSSProperties}
      onClick={() => onSelect(item)}
      className={cn(
        'relative flex items-center gap-2 border-b border-border px-3 text-left text-sm outline-none hover:bg-muted/60 focus-visible:bg-muted/60',
        active &&
          'bg-muted before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary',
      )}
    >
      {lead?.(item)}
      <span className="min-w-0 flex-1 truncate font-mono text-xs md:text-sm">
        {item.data}
      </span>
      {extra && (
        <span className="hidden shrink-0 font-mono text-xs text-muted-foreground md:block">
          {extra(item)}
        </span>
      )}
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {item.timestamp ? formatTehranDateTime(item.timestamp) : ''}
      </span>
    </button>
  );
};

export const MessageTable = ({ type, data, lead, extra }: Props) => {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const [filterType, setFilterType] = useState<'all' | 'send' | 'receive'>(
    'all',
  );
  const [filterKeyword, setFilterKeyword] = useState('');
  const keyword = useThrottle(filterKeyword, {
    wait: 500,
    leading: true,
    trailing: true,
  });
  const [bodyRef, { width, height }] = useElementSize();
  const [activeRow, setActiveRow] = useState<MessageItem | null>(null);

  const tableData = useMemo(() => {
    if (!data?.length) return [];
    let list = data.filter(Boolean);
    if (type === 'websocket' && filterType !== 'all') {
      list = list.filter((item) => item.type === filterType);
    }
    if (!keyword) return list;
    try {
      // eslint-disable-next-line no-eval
      const regex = eval(`/${keyword}/`);
      return list.filter(
        (item) => item.data.includes(keyword) || item.data.match(regex),
      );
    } catch (e) {
      return list;
    }
  }, [data, keyword, filterType, type]);

  const itemData = useMemo<RowData>(
    () => ({
      items: tableData,
      activeId: activeRow?.id,
      onSelect: setActiveRow,
      lead,
      extra,
    }),
    [tableData, activeRow?.id, lead, extra],
  );

  return (
    <div className="message-table flex h-[55dvh] min-h-64 flex-col">
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto pb-2">
        {type === 'websocket' &&
          (['all', 'send', 'receive'] as const).map((key) => (
            <FilterChip
              key={key}
              active={filterType === key}
              onClick={() => setFilterType(key)}
            >
              {t(`network.ws-${key}`, {
                defaultValue: { all: 'All', send: 'Sent', receive: 'Received' }[
                  key
                ],
              })}
            </FilterChip>
          ))}
        <SearchField
          value={filterKeyword}
          onChange={setFilterKeyword}
          label={t('network.filter-messages', {
            defaultValue: 'Filter messages (regexp)',
          })}
        />
      </div>
      <div
        ref={bodyRef}
        className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border"
      >
        {tableData.length === 0 ? (
          <PanelEmpty
            title={t('network.no-messages', { defaultValue: 'No messages' })}
          />
        ) : (
          <FixedSizeList
            width={width}
            height={height}
            itemCount={tableData.length}
            itemSize={isDesktop ? 36 : 44}
            itemData={itemData}
            itemKey={(index, d) => d.items[index].id}
          >
            {Row}
          </FixedSizeList>
        )}
      </div>

      <Sheet
        open={!!activeRow}
        onOpenChange={(open) => !open && setActiveRow(null)}
      >
        <SheetContent
          side="bottom"
          className="max-h-[70dvh] gap-0 overflow-y-auto rounded-t-xl p-0 pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader className="border-b border-border px-4 py-3 pr-12">
            <SheetTitle className="text-sm">
              {t('network.message-data', { defaultValue: 'Message' })}
            </SheetTitle>
          </SheetHeader>
          <div className="p-3">
            {activeRow?.data ? (
              <ColoredJson value={activeRow.data} />
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground">
                {t('network.no-messages', { defaultValue: 'No messages' })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
