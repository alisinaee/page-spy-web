import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VariableSizeList } from 'react-window';
import {
  ChevronLeft,
  CircleAlert,
  Copy,
  Download,
  Terminal,
} from 'lucide-react';
import copy from 'copy-to-clipboard';
import { formatTehranAbsolute, formatTehranDateTime } from '@/utils/tehran';
import { requestGetLogFileContent } from '@/apis';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FilterChip,
  PanelEmpty,
  PanelToolbar,
  SearchField,
} from '@/components/panel';
import { ConsoleList, groupConsoleItems } from '@/components/ConsoleList';
import { NetworkTable } from '@/components/NetworkTable';
import { NetworkType, TypeFilter } from '@/components/NetworkTable/TypeFilter';
import { Recording, TimelineMark, parseRecording } from '@/store/recording';
import { message } from '@/utils/message';
import { downloadRecording } from './utils';

type Tab = 'console' | 'network';
type ConsoleFilter = 'all' | 'error' | 'warn';

const BUCKETS = 48;

const clock = (time: number) => formatTehranDateTime(time);

const duration = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const noop = () => undefined;

interface TimelineProps {
  recording: Recording;
  cursor: number | null;
  onJump: (mark: TimelineMark) => void;
}

const Timeline = ({ recording, cursor, onJump }: TimelineProps) => {
  const { t } = useTranslation();
  const { startTime, endTime, marks } = recording;
  const span = Math.max(endTime - startTime, 1);

  // One dot per bucket and kind keeps the DOM small and the hit areas apart.
  const dots = useMemo(() => {
    const map = new Map<
      string,
      { mark: TimelineMark; count: number; pct: number }
    >();
    marks.forEach((mark) => {
      const ratio = Math.min(1, Math.max(0, (mark.time - startTime) / span));
      const bucket = Math.round(ratio * BUCKETS);
      const key = `${mark.kind}-${bucket}`;
      const found = map.get(key);
      if (found) found.count += 1;
      else map.set(key, { mark, count: 1, pct: (bucket / BUCKETS) * 100 });
    });
    return [...map.entries()];
  }, [marks, startTime, span]);

  const errorCount = marks.filter((m) => m.kind === 'error').length;
  const requestCount = marks.length - errorCount;
  const cursorPct =
    cursor == null
      ? null
      : Math.min(1, Math.max(0, (cursor - startTime) / span)) * 100;

  return (
    <div className="shrink-0 border-b border-border bg-background px-3 pt-1 pb-2">
      <div
        role="group"
        aria-label={t('recordings.timeline', { defaultValue: 'Timeline' })!}
        className="relative mx-3 h-11 md:h-8"
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted"
        />
        {cursorPct != null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 z-10 h-full w-0.5 -translate-x-1/2 bg-primary"
            style={{ left: `${cursorPct}%` }}
          >
            <span className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary" />
          </div>
        )}
        {dots.map(([key, { mark, count, pct }]) => {
          const label =
            mark.kind === 'error'
              ? t('recordings.jump-error', {
                  defaultValue: 'Jump to error at {{time}}',
                  time: clock(mark.time),
                })
              : t('recordings.jump-request', {
                  defaultValue: 'Jump to failed request at {{time}}',
                  time: clock(mark.time),
                });
          return (
            <button
              key={key}
              type="button"
              aria-label={count > 1 ? `${label} (${count})` : label}
              title={count > 1 ? `${label} (${count})` : label}
              onClick={() => onJump(mark)}
              style={{ left: `${pct}%` }}
              className="absolute top-0 flex h-full w-6 -translate-x-1/2 items-center justify-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {mark.kind === 'error' ? (
                <span className="size-2.5 rounded-full bg-destructive" />
              ) : (
                <span className="size-2.5 rotate-45 bg-warning" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2 font-mono text-xs text-muted-foreground">
        <span>{clock(startTime)}</span>
        <span className={cursor != null ? 'font-medium text-foreground' : ''}>
          {cursor != null ? clock(cursor) : duration(endTime - startTime)}
        </span>
        <span>{clock(endTime)}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-destructive"
          />
          {t('recordings.legend-errors', {
            defaultValue: 'Errors {{count}}',
            count: errorCount,
          })}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 rotate-45 bg-warning" />
          {t('recordings.legend-requests', {
            defaultValue: 'Failed requests {{count}}',
            count: requestCount,
          })}
        </span>
      </div>
    </div>
  );
};

const Viewer = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const url = params.get('url') || '';
  const device = params.get('device') || '';

  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const [tab, setTab] = useState<Tab>('console');
  const [consoleFilter, setConsoleFilter] = useState<ConsoleFilter>('all');
  const [networkType, setNetworkType] = useState<NetworkType>('All');
  const [networkKeyword, setNetworkKeyword] = useState('');
  const [target, setTarget] = useState<{ id: string; nonce: number } | null>(
    null,
  );
  const [cursor, setCursor] = useState<number | null>(null);
  const consoleRef = useRef<VariableSizeList>(null);

  const load = useCallback(async () => {
    if (!url) {
      setError(
        String(
          t('recordings.invalid-url', {
            defaultValue: 'No recording was specified',
          }),
        ),
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const raw = await requestGetLogFileContent(url);
      setRecording(await parseRecording(raw));
    } catch (e: any) {
      setError(e?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [url, t]);

  useEffect(() => {
    load();
  }, [load]);

  const consoleData = useMemo(() => {
    if (!recording) return [];
    if (consoleFilter === 'all') return recording.console;
    return recording.console.filter((i) => i.logType === consoleFilter);
  }, [recording, consoleFilter]);

  // Scroll once the console list has mounted and measured itself.
  useEffect(() => {
    if (!target || tab !== 'console') return;
    const grouped = groupConsoleItems(consoleData);
    const index = grouped.findIndex(
      (item) =>
        String(item.id) === target.id ||
        item.groupItems?.some((g) => String(g.id) === target.id),
    );
    if (index < 0) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (consoleRef.current) {
        consoleRef.current.scrollToItem(index, 'center');
        window.clearInterval(timer);
      } else if (tries > 20) {
        window.clearInterval(timer);
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [target, tab, consoleData]);

  const jump = (mark: TimelineMark) => {
    setCursor(mark.time);
    if (mark.kind === 'error') {
      setConsoleFilter('all');
      setTab('console');
      setTarget({ id: mark.refId, nonce: Date.now() });
      return;
    }
    const row = recording?.network.find((r) => r.id === mark.refId);
    setNetworkType('All');
    setNetworkKeyword(row?.url || '');
    setTab('network');
  };

  const download = async () => {
    setDownloading(true);
    try {
      await downloadRecording(url, `recording-${device || 'logs'}`);
    } catch (e: any) {
      message.error(
        e?.message ||
          t('recordings.download-failed', {
            defaultValue: 'Could not download the recording',
          }),
      );
    } finally {
      setDownloading(false);
    }
  };

  const meta = recording?.meta;
  const logTitle = meta?.logTitle?.trim();
  const note = meta?.remark?.trim();

  const topBar = (
    <>
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background px-2 md:h-12">
        <Button
          variant="ghost"
          size="icon-touch"
          className="md:size-9"
          aria-label={
            t('recordings.back', { defaultValue: 'Back to recordings' })!
          }
          nativeButton={false}
          render={<Link to="/recordings" />}
        >
          <ChevronLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            {logTitle ||
              note ||
              t('recordings.no-note', {
                defaultValue: 'No note',
              })}
          </div>
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            {device && <code className="truncate font-mono">{device}</code>}
            {recording && (
              <span className="shrink-0 font-mono">
                {formatTehranAbsolute(recording.startTime)}
                <span aria-hidden="true"> – </span>
                {clock(recording.endTime)}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="icon-touch"
          className="md:h-9 md:min-h-0 md:w-auto md:min-w-0 md:gap-1.5 md:px-3 md:text-sm"
          aria-label={t('recordings.download', { defaultValue: 'Download' })!}
          disabled={!url || downloading}
          onClick={download}
        >
          <Download />
          <span className="hidden md:inline">
            {t('recordings.download', { defaultValue: 'Download' })}
          </span>
        </Button>
      </div>
      {logTitle && note ? (
        <div className="flex items-start gap-3 border-b border-border bg-muted/30 px-3 py-2">
          <p
            dir="auto"
            className="min-w-0 flex-1 break-words text-sm leading-6"
          >
            {note.replace(/[ \t]*\n[ \t]*/g, ' ')}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            aria-label="Copy description"
            onClick={() => copy(note)}
          >
            <Copy />
            Copy
          </Button>
        </div>
      ) : null}
    </>
  );

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col bg-background text-foreground">
        {topBar}
        <div className="flex flex-col gap-3 p-3" aria-hidden="true">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col bg-background text-foreground">
        {topBar}
        <div className="min-h-0 flex-1 p-3">
          <PanelEmpty
            icon={<CircleAlert className="text-destructive" />}
            title={t('recordings.open-failed', {
              defaultValue: 'Could not open this recording',
            })}
            description={error}
            action={
              <Button
                size="touch"
                variant="outline"
                className="md:h-9 md:text-sm"
                onClick={load}
              >
                {t('common.retry', { defaultValue: 'Retry' })}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const filterLabels: Record<ConsoleFilter, string> = {
    all: t('recordings.filter-all', { defaultValue: 'All' }),
    error: t('recordings.filter-errors', { defaultValue: 'Errors' }),
    warn: t('recordings.filter-warnings', { defaultValue: 'Warnings' }),
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background text-foreground">
      {topBar}
      <Timeline recording={recording} cursor={cursor} onJump={jump} />
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
        className="min-h-0 flex-1 gap-0"
      >
        <TabsList className="h-11 w-full shrink-0 rounded-none md:h-9">
          <TabsTrigger value="console">
            {t('devtool.menu.Console')}
            <span className="font-mono text-xs text-muted-foreground">
              {recording.console.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="network">
            {t('devtool.menu.Network')}
            <span className="font-mono text-xs text-muted-foreground">
              {recording.network.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {tab === 'console' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <PanelToolbar>
              {(['all', 'error', 'warn'] as ConsoleFilter[]).map((key) => (
                <FilterChip
                  key={key}
                  active={consoleFilter === key}
                  onClick={() => setConsoleFilter(key)}
                >
                  {filterLabels[key]}
                </FilterChip>
              ))}
            </PanelToolbar>
            <div className="min-h-0 flex-1">
              {consoleData.length === 0 ? (
                <PanelEmpty
                  icon={<Terminal />}
                  title={t('recordings.no-console', {
                    defaultValue: 'No console output',
                  })}
                />
              ) : (
                <ConsoleList
                  ref={consoleRef}
                  data={consoleData}
                  onScroll={noop}
                  onActivate={(item) => {
                    if (item.time) setCursor(item.time);
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <PanelToolbar
              search={
                <SearchField
                  value={networkKeyword}
                  onChange={setNetworkKeyword}
                  label={t('network.filter-url', {
                    defaultValue: 'Filter by URL',
                  })}
                />
              }
            >
              <TypeFilter value={networkType} onChange={setNetworkType} />
            </PanelToolbar>
            <NetworkTable
              data={recording.network}
              filterType={networkType}
              filterKeyword={networkKeyword}
              onActivate={(row) => {
                if (row.startTime) setCursor(Number(row.startTime));
              }}
            />
          </div>
        )}
      </Tabs>
    </div>
  );
};

export default Viewer;
