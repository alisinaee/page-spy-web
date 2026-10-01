import { useMiscStore } from '@/store/misc';
import { SpyStorage } from '@huolala-tech/page-spy-types';
import clsx from 'clsx';
import copy from 'copy-to-clipboard';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Network, MoreVertical } from 'lucide-react';
import { ResolvedNetworkInfo } from '@/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DetailPane, PanelEmpty, useIsDesktop } from '@/components/panel';
import { useEventListener } from '@/utils/useEventListener';
import { message } from '@/utils/message';
import { getSizeText, getStatusInfo, getTime } from './utils';
import { buildCurlCommand, responseLogText } from './body-codec';
import { NetworkDetail } from './NetworkDetail';
import { StatusCode } from './StatusCode';
import { NetworkType, RESOURCE_TYPE } from './TypeFilter';
import { useElementSize } from './useElementSize';

type SortKey = 'name' | 'method' | 'status' | 'requestType' | 'costTime';
type SortDir = 'ASC' | 'DESC';

const COLUMNS: { key: SortKey | 'size'; label: string; width: string }[] = [
  { key: 'method', label: 'Method', width: 'w-20' },
  { key: 'status', label: 'Status', width: 'w-28' },
  { key: 'requestType', label: 'Type', width: 'w-24' },
  { key: 'size', label: 'Size', width: 'w-24' },
  { key: 'costTime', label: 'Time', width: 'w-24' },
];

const formatResponseLog = (row: ResolvedNetworkInfo) => {
  const headerText = row.responseHeader
    ? row.responseHeader.map(([key, value]) => `${key}: ${value}`).join('\n')
    : '';
  return [
    '# Response',
    `status: ${row.status ?? ''}`,
    headerText,
    responseLogText(row.response, row.responseReason),
  ]
    .filter(Boolean)
    .join('\n');
};

interface RowData {
  items: ResolvedNetworkInfo[];
  activeId?: string;
  /** phone: stacked row; narrow: Name/Status/Time; wide: all columns */
  mode: 'phone' | 'narrow' | 'wide';
  onSelect: (row: ResolvedNetworkInfo) => void;
  onMenu: (key: string, row: ResolvedNetworkInfo) => void;
  onContextMenu: (event: ReactMouseEvent, row: ResolvedNetworkInfo) => void;
}

const Row = ({ index, style, data }: ListChildComponentProps<RowData>) => {
  const { t } = useTranslation('translation', { keyPrefix: 'network' });
  const { items, activeId, mode, onSelect, onMenu, onContextMenu } = data;
  const row = items[index];
  const active = row.id === activeId;
  const { status } = getStatusInfo(row);
  const code = Number(row.status);
  const isWarn = status === 'error' && code >= 400 && code < 500;
  const isError = status === 'error' && !isWarn;

  return (
    <div
      style={style}
      role="row"
      onContextMenu={(event) => onContextMenu(event, row)}
      className={clsx(
        'relative flex items-center border-b border-border hover:bg-muted/60',
        isWarn && 'bg-warning/10',
        isError && 'bg-destructive/10',
        active &&
          'bg-muted before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary',
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(row)}
        title={row.url}
        className="flex h-full min-w-0 flex-1 items-center gap-2 pl-3 text-left text-sm outline-none focus-visible:bg-muted/60"
      >
        {mode === 'phone' && (
          <span className="w-12 shrink-0 rounded border border-border px-1 text-center font-mono text-xs">
            {row.method}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate font-mono text-xs md:text-sm">
          {row.name || row.url}
        </span>
        {mode === 'phone' ? (
          <span className="flex shrink-0 flex-col items-end text-xs">
            <StatusCode data={row} />
            <span className="font-mono text-muted-foreground">
              {getTime(row.costTime)}
            </span>
          </span>
        ) : (
          <>
            {mode === 'wide' && (
              <span className="w-20 shrink-0 font-mono text-sm">
                {row.method}
              </span>
            )}
            <span className="w-28 shrink-0 text-sm">
              <StatusCode data={row} />
            </span>
            {mode === 'wide' && (
              <>
                <span className="w-24 shrink-0 truncate text-sm text-muted-foreground">
                  {row.requestType}
                </span>
                <span className="w-24 shrink-0 font-mono text-sm text-muted-foreground">
                  {getSizeText(row)}
                </span>
              </>
            )}
            <span className="w-24 shrink-0 font-mono text-sm text-muted-foreground">
              {getTime(row.costTime)}
            </span>
          </>
        )}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-touch"
              aria-label={t('row-actions', { defaultValue: 'Row actions' })!}
              className="md:size-8 md:min-h-0 md:min-w-0"
            />
          }
        >
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-48">
          <DropdownMenuItem onClick={() => onMenu('open-in-new-tab', row)}>
            {t('open-in-new-tab')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMenu('copy-link', row)}>
            {t('copy-link-address')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMenu('copy-cURL', row)}>
            {t('copy-as-curl')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMenu('copy-response', row)}>
            {t('copy-response', { defaultValue: 'Copy response' })}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMenu('copy-full-log', row)}>
            {t('copy-full-log')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

interface NetworkTableProps {
  data: ResolvedNetworkInfo[];
  filterType: NetworkType;
  filterKeyword: string;
  cookie?: SpyStorage.GetTypeDataItem['data'];
  onActivate?: (row: ResolvedNetworkInfo) => void;
  /** 1-based index of the open match, and how many rows match the keyword. */
  onMatchState?: (state: { index: number; count: number }) => void;
  searchStepRef?: MutableRefObject<(delta: number) => void>;
}

const RowContextMenu = ({
  x,
  y,
  onClose,
  onPick,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onPick: (key: string) => void;
}) => {
  const { t } = useTranslation('translation', { keyPrefix: 'network' });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer, true);
    window.addEventListener('scroll', onClose, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  const items = [
    ['open-in-new-tab', t('open-in-new-tab')],
    ['copy-link', t('copy-link-address')],
    ['copy-cURL', t('copy-as-curl')],
    ['copy-response', t('copy-response', { defaultValue: 'Copy response' })],
    ['copy-full-log', t('copy-full-log')],
  ] as const;
  const left = Math.max(8, Math.min(x, window.innerWidth - 220));
  const top = Math.max(8, Math.min(y, window.innerHeight - 240));

  return createPortal(
    <div
      ref={ref}
      role="menu"
      className="fixed z-[80] min-w-48 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
      style={{ left, top }}
    >
      {items.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="menuitem"
          className="flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent md:min-h-8"
          onClick={() => {
            onPick(key);
            onClose();
          }}
        >
          {label}
        </button>
      ))}
    </div>,
    document.body,
  );
};

export const NetworkTable = ({
  data: originData,
  cookie,
  filterType = 'All',
  filterKeyword = '',
  onActivate,
  onMatchState,
  searchStepRef,
}: NetworkTableProps) => {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const [containerRef, { width, height }] = useElementSize();
  const listRef = useRef<FixedSizeList<RowData> | null>(null);
  const [activeRow, setActiveRow] = useState<ResolvedNetworkInfo | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    row: ResolvedNetworkInfo;
  } | null>(null);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // See: https://github.com/HuolalaTech/page-spy-web/issues/382
  const removeDuplicatedData = useMemo(() => {
    const isSuspiciousResource = (item: ResolvedNetworkInfo) =>
      !item.requestType && item.responseType === 'resource';

    const normalUrls = new Set<string>(
      originData
        .filter((item) => !isSuspiciousResource(item))
        .map((item) => item.url),
    );

    return originData.filter(
      (item) => !isSuspiciousResource(item) || !normalUrls.has(item.url),
    );
  }, [originData]);

  const data = useMemo(() => {
    const keyword = filterKeyword.trim().toLocaleLowerCase();
    if (!keyword && filterType === 'All' && !sort) {
      return removeDuplicatedData;
    }
    const filtered = removeDuplicatedData.filter(
      (msg) =>
        RESOURCE_TYPE.get(filterType)?.(msg.requestType) &&
        msg.url.toLocaleLowerCase().includes(keyword),
    );
    if (!sort) return filtered;
    const { key, dir } = sort;
    return [...filtered].sort((a, b) => {
      if (a[key] < b[key]) return dir === 'ASC' ? -1 : 1;
      if (a[key] > b[key]) return dir === 'ASC' ? 1 : -1;
      return 0;
    });
  }, [filterKeyword, filterType, removeDuplicatedData, sort]);

  // Update the active row real-time
  useEffect(() => {
    if (!showDetail || !activeRow) return;
    const next = data.find((item) => item.id === activeRow.id);
    if (next && next !== activeRow) setActiveRow(next);
  }, [data, activeRow, showDetail]);

  useEventListener('keydown', (evt) => {
    if (!showDetail || !activeRow) return;
    const { key } = evt as KeyboardEvent;
    const index = data.findIndex((item) => item.id === activeRow.id);
    if (key === 'ArrowUp' && index > 0) setActiveRow(data[index - 1]);
    if (key === 'ArrowDown' && index < data.length - 1)
      setActiveRow(data[index + 1]);
  });

  const stepTo = useCallback(
    (delta: number) => {
      if (!data.length) return;
      const current = activeRow
        ? data.findIndex((item) => item.id === activeRow.id)
        : -1;
      const next =
        current < 0
          ? delta < 0
            ? data.length - 1
            : 0
          : (current + delta + data.length) % data.length;
      const row = data[next];
      useMiscStore.getState().setIsAutoScroll(false);
      setActiveRow(row);
      setShowDetail(true);
      onActivate?.(row);
      requestAnimationFrame(() => listRef.current?.scrollToItem(next, 'smart'));
    },
    [activeRow, data, onActivate],
  );

  useEffect(() => {
    if (searchStepRef) searchStepRef.current = stepTo;
  }, [searchStepRef, stepTo]);

  const appliedKeyword = useRef('');
  useEffect(() => {
    const keyword = filterKeyword.trim();
    if (!keyword) {
      appliedKeyword.current = '';
      return;
    }
    if (appliedKeyword.current === keyword || data.length === 0) return;
    appliedKeyword.current = keyword;
    const row = data[0];
    setActiveRow(row);
    setShowDetail(true);
    onActivate?.(row);
    requestAnimationFrame(() => listRef.current?.scrollToItem(0));
  }, [data, filterKeyword, onActivate]);

  const reportedMatch = useRef({ index: -1, count: -1 });
  useEffect(() => {
    if (!onMatchState) return;
    const keyword = filterKeyword.trim();
    const current =
      keyword && activeRow
        ? data.findIndex((item) => item.id === activeRow.id)
        : -1;
    const next = {
      count: keyword ? data.length : 0,
      index: current < 0 ? 0 : current + 1,
    };
    if (
      reportedMatch.current.index === next.index &&
      reportedMatch.current.count === next.count
    ) {
      return;
    }
    reportedMatch.current = next;
    onMatchState(next);
  }, [activeRow, data, filterKeyword, onMatchState]);

  useEffect(() => {
    const handleScrollToEnd = () => {
      if (data.length > 0) listRef.current?.scrollToItem(data.length - 1);
    };
    window.addEventListener('devtools:scroll-network-end', handleScrollToEnd);
    return () =>
      window.removeEventListener(
        'devtools:scroll-network-end',
        handleScrollToEnd,
      );
  }, [data]);

  const mode: RowData['mode'] = !isDesktop
    ? 'phone'
    : showDetail || (width > 0 && width < 640)
    ? 'narrow'
    : 'wide';

  const runMenu = useCallback(
    (key: string, row: ResolvedNetworkInfo) => {
      const copied = (value: string) => {
        copy(value);
        message.success(t('network.copied', { defaultValue: 'Copied' }));
      };
      switch (key) {
        case 'copy-link':
          copied(row.url);
          break;
        case 'open-in-new-tab':
          window.open(row.url);
          break;
        case 'copy-cURL':
          copied(buildCurlCommand(row, cookie));
          break;
        case 'copy-response':
          copied(formatResponseLog(row));
          break;
        case 'copy-full-log':
          copied(
            [buildCurlCommand(row, cookie), '', formatResponseLog(row)].join(
              '\n',
            ),
          );
          break;
        default:
          break;
      }
    },
    [cookie, t],
  );

  const itemData = useMemo<RowData>(
    () => ({
      items: data,
      mode,
      activeId: showDetail ? activeRow?.id : undefined,
      onSelect: (row) => {
        // Opening a request is reading. Do not let the console tail
        // follow jump this pane shut when the user comes back.
        useMiscStore.getState().setIsAutoScroll(false);
        setActiveRow(row);
        setShowDetail(true);
        onActivate?.(row);
      },
      onMenu: runMenu,
      onContextMenu: (event, row) => {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY, row });
      },
    }),
    [data, mode, activeRow?.id, showDetail, runMenu, onActivate],
  );

  const toggleSort = (key: SortKey) =>
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'ASC' };
      return prev.dir === 'ASC' ? { key, dir: 'DESC' } : null;
    });

  const sortable = (key: string): key is SortKey => key !== 'size';
  const SortIcon = sort?.dir === 'ASC' ? ArrowUp : ArrowDown;
  const headerCell = (key: SortKey | 'size', label: string, cls: string) => {
    const isSorted = sort?.key === key;
    const content = (
      <>
        {label}
        {isSorted && <SortIcon className="size-3" />}
      </>
    );
    return sortable(key) ? (
      <button
        key={key}
        type="button"
        onClick={() => toggleSort(key)}
        aria-sort={
          isSorted ? (sort?.dir === 'ASC' ? 'ascending' : 'descending') : 'none'
        }
        className={clsx('flex shrink-0 items-center gap-1 text-left', cls)}
      >
        {content}
      </button>
    ) : (
      <span key={key} className={clsx('shrink-0', cls)}>
        {label}
      </span>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div className="network-table flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        {mode !== 'phone' && data.length > 0 && (
          <div
            role="row"
            className="flex h-8 shrink-0 items-center border-b border-border bg-muted pr-8 pl-3 text-xs font-medium text-muted-foreground"
          >
            {headerCell('name', 'Name', 'flex-1 min-w-0')}
            {COLUMNS.filter(
              (c) =>
                mode === 'wide' || c.key === 'status' || c.key === 'costTime',
            ).map((c) =>
              headerCell(c.key, c.label, c.key === 'status' ? 'w-28' : c.width),
            )}
          </div>
        )}
        <div ref={containerRef} className="min-h-0 flex-1 overflow-hidden">
          {data.length === 0 ? (
            <PanelEmpty
              icon={<Network />}
              title={t('network.empty', { defaultValue: 'No requests yet' })}
            />
          ) : (
            <FixedSizeList
              ref={listRef}
              // SectionLogActions finds the scroller by this class
              className="ReactVirtualized__Grid"
              width={width}
              height={height}
              itemCount={data.length}
              itemSize={isDesktop ? 36 : 44}
              itemData={itemData}
              itemKey={(index, d) => d.items[index].id}
            >
              {Row}
            </FixedSizeList>
          )}
        </div>
      </div>
      <DetailPane
        open={showDetail && !!activeRow}
        onClose={() => setShowDetail(false)}
        title={activeRow?.url ?? ''}
      >
        {activeRow && <NetworkDetail data={activeRow} cookie={cookie} />}
      </DetailPane>
      {contextMenu && (
        <RowContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onPick={(key) => runMenu(key, contextMenu.row)}
        />
      )}
    </div>
  );
};
