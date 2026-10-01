import { getSpyRoom } from '@/apis';
import {
  AllBrowserTypes,
  ClientRoomInfo,
  OS_CONFIG,
  getBrowserName,
  parseUserAgent,
} from '@/utils/brand';
import { useRequest } from 'ahooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CircleAlert,
  Inbox,
  ListFilter,
  Search,
  X,
} from 'lucide-react';
import { RoomCard } from './RoomCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { message } from '@/utils/message';

const MAXIMUM_CONNECTIONS = 30;

const sortConnections = (data: ClientRoomInfo[]) => {
  const [valid, invalid] = (data || []).reduce(
    (acc, cur) => {
      const hasClient =
        cur.connections.findIndex((i) => i.userId === 'Client') > -1;
      if (hasClient) acc[0].push(cur);
      else acc[1].push(cur);
      return acc;
    },
    [[], []] as I.SpyRoom[][],
  );

  // 有效房间再按创建时间升序
  const ascWithCreatedAtForInvalid = valid.sort((a, b) => {
    if (a.createdAt < b.createdAt) {
      return -1;
    }
    return 1;
  });
  // 失效房间再按活动时间降序
  const ascWithActiveAtForInvalid = invalid.sort((a, b) => {
    if (a.activeAt > b.activeAt) {
      return -1;
    }
    return 1;
  });

  return [...ascWithCreatedAtForInvalid, ...ascWithActiveAtForInvalid];
};

const ALL = 'all';

interface Filters {
  os: string;
  browser: string;
}
const EMPTY_FILTERS: Filters = { os: '', browser: '' };

const filterConnections = (
  data: ClientRoomInfo[],
  query: string,
  { os, browser }: Filters,
) => {
  const q = query.trim().toLowerCase();
  return data.filter((i) => {
    if (q) {
      const hit = [i.address, decodeURI(i.group || ''), i.tags.title].some(
        (v) =>
          String(v ?? '')
            .toLowerCase()
            .includes(q),
      );
      if (!hit) return false;
    }
    return (
      (!os || i.os.type === os) &&
      (!browser || i.browser.type.toLowerCase().includes(browser))
    );
  });
};

const useIsDesktop = () => {
  const [matches, setMatches] = useState(
    () => window.matchMedia('(min-width: 768px)').matches,
  );
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return matches;
};

const RoomList = () => {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const showLoadingRef = useRef(false);
  const {
    loading,
    data: connectionList = [],
    error,
    runAsync: requestConnections,
  } = useRequest(
    async (group = '') => {
      const res = await getSpyRoom(group);
      return res.data?.map((conn) => {
        const { os, browser } = parseUserAgent(conn.name);
        return {
          ...conn,
          os,
          browser,
        };
      });
    },
    {
      pollingInterval: 5000,
      pollingWhenHidden: false,
      pollingErrorRetryCount: 0,
      onError(e) {
        message.error(e.message);
      },
      onFinally() {
        showLoadingRef.current = true;
      },
    },
  );

  const browserOptions = useMemo(() => {
    return AllBrowserTypes.filter((browser) => {
      return connectionList?.some(
        (conn) => conn.browser.type.toLocaleLowerCase() === browser,
      );
    }).map((name) => ({ value: name as string, label: getBrowserName(name) }));
  }, [connectionList]);

  const osItems = useMemo(
    () => [
      { value: ALL, label: t('connections.select-os') as string },
      ...Object.entries(OS_CONFIG).map(([value, conf]) => ({
        value,
        label: conf.label,
      })),
    ],
    [t],
  );
  const browserItems = useMemo(
    () => [
      { value: ALL, label: t('connections.select-browser') as string },
      ...browserOptions,
    ],
    [browserOptions, t],
  );

  const activeFilterCount = (filters.os ? 1 : 0) + (filters.browser ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0 || !!query.trim();

  const matched = useMemo(
    () => filterConnections(connectionList, query, filters),
    [connectionList, query, filters],
  );
  const showMaximumAlert = matched.length > MAXIMUM_CONNECTIONS;
  const list = useMemo(
    () => sortConnections(matched.slice(0, MAXIMUM_CONNECTIONS)),
    [matched],
  );

  const retry = () => {
    requestConnections('').catch((e: any) => message.error(e.message));
  };
  const clearAll = () => {
    setQuery('');
    setFilters(EMPTY_FILTERS);
    setDraft(EMPTY_FILTERS);
  };
  const openSheet = (open: boolean) => {
    if (open) setDraft(filters);
    setSheetOpen(open);
  };

  const osLabel = filters.os
    ? OS_CONFIG[filters.os as keyof typeof OS_CONFIG]?.label || filters.os
    : '';
  const browserLabel = filters.browser ? getBrowserName(filters.browser) : '';

  const renderBody = () => {
    if (loading && !showLoadingRef.current) {
      return (
        <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="gap-3 p-4" aria-hidden="true">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-11 w-full md:h-9" />
            </Card>
          ))}
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex min-h-full p-3">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleAlert className="text-destructive" />
              </EmptyMedia>
              <EmptyTitle>
                {t('connections.load-failed', {
                  defaultValue: 'Could not load devices',
                })}
              </EmptyTitle>
              <EmptyDescription>{error.message}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                size="touch"
                variant="outline"
                className="md:h-9 md:text-sm"
                onClick={retry}
              >
                {t('common.retry', { defaultValue: 'Retry' })}
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <div className="flex min-h-full p-3">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>
                {hasActiveFilters
                  ? t('connections.no-match', {
                      defaultValue: 'No matching devices',
                    })
                  : t('connections.no-devices', {
                      defaultValue: 'No devices connected',
                    })}
              </EmptyTitle>
              {!hasActiveFilters && (
                <EmptyDescription>
                  {t('connections.no-devices-hint', {
                    defaultValue:
                      'Open the app with debugging enabled, then refresh',
                  })}
                </EmptyDescription>
              )}
            </EmptyHeader>
            {hasActiveFilters && (
              <EmptyContent>
                <Button
                  size="touch"
                  variant="outline"
                  className="md:h-9 md:text-sm"
                  onClick={clearAll}
                >
                  {t('connections.clear-filters', {
                    defaultValue: 'Clear filters',
                  })}
                </Button>
              </EmptyContent>
            )}
          </Empty>
        </div>
      );
    }
    return (
      <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {list.map((room) => (
          <RoomCard key={room.address} room={room} />
        ))}
      </div>
    );
  };

  const chip = (label: string, onRemove: () => void) => (
    <Button
      key={label}
      type="button"
      variant="secondary"
      size="touch"
      className="h-8 min-h-8 min-w-0 gap-1 px-3 text-xs md:h-6 md:min-h-6"
      aria-label={
        t('connections.remove-filter', {
          defaultValue: 'Remove filter {{name}}',
          name: label,
        }) as string
      }
      onClick={onRemove}
    >
      {label}
      <X className="size-3" />
    </Button>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background text-foreground">
      <div className="sticky top-0 z-10 flex shrink-0 gap-2 border-b border-border bg-background p-3">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label={
              t('connections.search-label', {
                defaultValue: 'Search devices',
              }) as string
            }
            placeholder={
              t('connections.search-placeholder', {
                defaultValue: 'Search device ID, project or title',
              }) as string
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 pl-9 text-base md:h-9 md:text-sm"
          />
        </div>
        <Button
          variant="outline"
          size="touch"
          className="md:h-9 md:text-sm"
          onClick={() => openSheet(true)}
        >
          <ListFilter />
          {t('common.filter')}
          {activeFilterCount > 0 && (
            <Badge>
              {activeFilterCount}
              <span className="sr-only">
                {t('connections.active-filters', {
                  defaultValue: 'active filters',
                })}
              </span>
            </Badge>
          )}
        </Button>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 px-3 pt-3">
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {t('connections.device-count', {
            defaultValue: '{{count}} devices',
            count: matched.length,
          })}
        </span>
        {filters.os &&
          chip(osLabel, () => setFilters((f) => ({ ...f, os: '' })))}
        {filters.browser &&
          chip(browserLabel, () => setFilters((f) => ({ ...f, browser: '' })))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {showMaximumAlert && (
          <div className="px-3 pt-3">
            <Alert>
              <AlertTriangle className="text-warning" />
              <AlertDescription>
                {t('connections.maximum-alert')}
              </AlertDescription>
            </Alert>
          </div>
        )}
        {renderBody()}
      </div>

      <Sheet open={sheetOpen} onOpenChange={openSheet}>
        <SheetContent
          side={isDesktop ? 'right' : 'bottom'}
          className="max-h-[85dvh] md:max-h-none"
        >
          <SheetHeader>
            <SheetTitle>{t('common.filter')}</SheetTitle>
            <SheetDescription className="sr-only">
              {t('connections.filter-desc', {
                defaultValue: 'Filter devices by OS and platform',
              })}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="filter-os"
                className="text-xs font-medium text-muted-foreground"
              >
                {t('common.os', { defaultValue: 'OS' })}
              </label>
              <Select
                items={osItems}
                value={draft.os || ALL}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, os: !v || v === ALL ? '' : v }))
                }
              >
                <SelectTrigger
                  id="filter-os"
                  className="h-11 w-full text-base md:h-9 md:text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {osItems.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="filter-platform"
                className="text-xs font-medium text-muted-foreground"
              >
                {t('devtool.platform', { defaultValue: 'Platform' })}
              </label>
              <Select
                items={browserItems}
                value={draft.browser || ALL}
                onValueChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    browser: !v || v === ALL ? '' : v,
                  }))
                }
              >
                <SelectTrigger
                  id="filter-platform"
                  className="h-11 w-full text-base md:h-9 md:text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {browserItems.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="flex-row gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              variant="outline"
              size="touch"
              className="flex-1 md:h-9 md:text-sm"
              onClick={() => {
                setDraft(EMPTY_FILTERS);
                setFilters(EMPTY_FILTERS);
                setSheetOpen(false);
              }}
            >
              {t('common.reset')}
            </Button>
            <Button
              size="touch"
              className="flex-1 md:h-9 md:text-sm"
              onClick={() => {
                setFilters(draft);
                setSheetOpen(false);
              }}
            >
              {t('connections.apply', { defaultValue: 'Apply' })}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default RoomList;
