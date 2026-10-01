import { getSpyRoom } from '@/apis';
import {
  AllBrowserTypes,
  ClientRoomInfo,
  OS_CONFIG,
  getBrowserLogo,
  getBrowserName,
  parseUserAgent,
} from '@/utils/brand';
import { useRequest } from 'ahooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RotateCcw, Filter, Inbox } from 'lucide-react';
import { RoomCard } from './RoomCard';
import { Statistics } from './Statistics';
import { LoadingFallback } from '@/components/LoadingFallback';
import { debug } from '@/utils/debug';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
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

const filterConnections = (
  data: ClientRoomInfo[],
  condition: Record<'title' | 'address' | 'os' | 'browser', string>,
) => {
  const { title = '', address = '', os = '', browser = '' } = condition;
  const lowerCaseTitle = String(title).trim().toLowerCase();
  return data
    .filter(({ tags }) => {
      return String(tags.title).toLowerCase().includes(lowerCaseTitle);
    })
    .filter((i) => {
      const query = String(address || '')
        .trim()
        .toLowerCase();
      if (!query) return true;
      return String(i.address || '')
        .toLowerCase()
        .includes(query);
    })
    .filter((clientInfo) => {
      return (
        (!os || clientInfo.os.type === os) &&
        (!browser || clientInfo.browser.type.includes(browser))
      );
    });
};

const RoomList = () => {
  const { t } = useTranslation();

  const [formState, setFormState] = useState({
    title: '',
    address: '',
    project: '',
    os: '',
    browser: '',
  });

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [showMaximumAlert, setMaximumAlert] = useState(false);
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

  const BrowserOptions = useMemo(() => {
    return AllBrowserTypes.filter((browser) => {
      return connectionList?.some(
        (conn) => conn.browser.type.toLocaleLowerCase() === browser,
      );
    }).map((name) => {
      return {
        name,
        label: getBrowserName(name),
        logo: getBrowserLogo(name),
      };
    });
  }, [connectionList]);

  const [conditions, setConditions] = useState({
    title: '',
    address: '',
    project: '',
    os: '',
    browser: '',
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (conditions.title) count++;
    if (conditions.address) count++;
    if (conditions.project) count++;
    if (conditions.os) count++;
    if (conditions.browser) count++;
    return count;
  }, [conditions]);
  const hasActiveFilters = activeFilterCount > 0;

  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      try {
        await requestConnections(formState.project);
        setConditions(formState);
      } catch (e: any) {
        message.error(e.message);
      }
    },
    [formState, requestConnections],
  );

  const handleReset = useCallback(() => {
    const emptyState = {
      title: '',
      address: '',
      project: '',
      os: '',
      browser: '',
    };
    setFormState(emptyState);
    setConditions(emptyState);
    requestConnections('');
  }, [requestConnections]);

  const mainContent = useMemo(() => {
    if (loading && !showLoadingRef.current) {
      return <LoadingFallback />;
    }
    const matchedConnections = filterConnections(connectionList, conditions);
    if (error || matchedConnections.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <Inbox className="size-12 opacity-30" />
          <p className="text-sm">
            {t('common.empty', { defaultValue: 'No connections' })}
          </p>
        </div>
      );
    }
    const list = sortConnections(
      matchedConnections.slice(0, MAXIMUM_CONNECTIONS),
    );

    return (
      <div className="flex flex-wrap p-4 w-full">
        {list.map((room) => (
          <RoomCard key={room.address} room={room} />
        ))}
      </div>
    );
  }, [conditions, connectionList, error, loading, t]);

  useEffect(() => {
    const matchedConnections = filterConnections(connectionList, conditions);
    setMaximumAlert(matchedConnections.length > MAXIMUM_CONNECTIONS);
  }, [connectionList, conditions]);

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full min-h-0 bg-background text-foreground">
      {/* Desktop Sider */}
      <aside className="hidden md:flex flex-col w-[350px] shrink-0 border-r border-border p-6 overflow-y-auto bg-card/30">
        <div className="flex flex-col gap-6">
          <h3 className="text-xl font-bold tracking-tight text-foreground m-0">
            {t('common.connections')}
          </h3>
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('common.device-id')}
              </label>
              <Input
                placeholder={t('common.device-id')!}
                value={formState.address}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, address: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('common.project')}
              </label>
              <Input
                placeholder={t('common.project')!}
                value={formState.project}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, project: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('common.title')}
              </label>
              <Input
                placeholder={t('common.title')!}
                value={formState.title}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, title: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('common.os')}
              </label>
              <select
                aria-label={t('common.os')!}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                value={formState.os}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, os: e.target.value }))
                }
              >
                <option value="">{t('connections.select-os')}</option>
                {Object.entries(OS_CONFIG).map(([name, conf]) => (
                  <option value={name} key={name}>
                    {conf.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('devtool.platform')}
              </label>
              <select
                aria-label={t('devtool.platform')!}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                value={formState.browser}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, browser: e.target.value }))
                }
              >
                <option value="">{t('connections.select-browser')}</option>
                {!!BrowserOptions.length && (
                  <optgroup label="Web">
                    {BrowserOptions.map(({ name, label }) => (
                      <option key={name} value={name}>
                        {label}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="submit"
                variant="default"
                size="default"
                className="flex items-center gap-1.5"
              >
                <Search className="size-4" />
                <span>{t('common.search')}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="default"
                className="flex items-center gap-1.5"
                onClick={handleReset}
              >
                <RotateCcw className="size-4" />
                <span>{t('common.reset')}</span>
              </Button>
            </div>

            {showMaximumAlert && (
              <div className="text-xs text-warning bg-warning/10 p-2.5 rounded border border-warning/20">
                {t('connections.maximum-alert')}
              </div>
            )}
          </form>
          {debug.enabled && <Statistics data={connectionList} />}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex md:hidden items-center justify-between p-4 border-b border-border bg-card/40">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold m-0 text-foreground">
              {t('common.connections')}
            </h4>
            <Badge
              variant="secondary"
              className="bg-primary/15 text-primary-text"
            >
              {filterConnections(connectionList, conditions).length}
            </Badge>
          </div>
          <Button
            size="touch"
            variant={hasActiveFilters ? 'default' : 'outline'}
            className="flex items-center gap-2"
            onClick={() => setMobileFilterOpen(true)}
          >
            <Filter className="size-4" />
            <span>
              {hasActiveFilters ? `Filter (${activeFilterCount})` : 'Filter'}
            </span>
          </Button>
        </div>

        <div className="flex-1">{mainContent}</div>

        {/* Mobile Filter Sheet */}
        <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
          <SheetContent
            side="right"
            className="w-[85vw] max-w-md bg-card p-6 flex flex-col gap-4"
          >
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-foreground">
                <Filter className="size-4 text-primary" />
                <span>Filter Connections</span>
              </SheetTitle>
            </SheetHeader>
            <form
              onSubmit={(e) => {
                handleSearch(e);
                setMobileFilterOpen(false);
              }}
              className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('common.device-id')}
                </label>
                <Input
                  placeholder={t('common.device-id')!}
                  value={formState.address}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, address: e.target.value }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('common.project')}
                </label>
                <Input
                  placeholder={t('common.project')!}
                  value={formState.project}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, project: e.target.value }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('common.title')}
                </label>
                <Input
                  placeholder={t('common.title')!}
                  value={formState.title}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, title: e.target.value }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('common.os')}
                </label>
                <select
                  aria-label={t('common.os')!}
                  className="h-11 min-h-[44px] w-full rounded-lg border border-input bg-transparent px-2.5 text-base text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  value={formState.os}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, os: e.target.value }))
                  }
                >
                  <option value="">{t('connections.select-os')}</option>
                  {Object.entries(OS_CONFIG).map(([name, conf]) => (
                    <option value={name} key={name}>
                      {conf.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('devtool.platform')}
                </label>
                <select
                  aria-label={t('devtool.platform')!}
                  className="h-11 min-h-[44px] w-full rounded-lg border border-input bg-transparent px-2.5 text-base text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  value={formState.browser}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, browser: e.target.value }))
                  }
                >
                  <option value="">{t('connections.select-browser')}</option>
                  {!!BrowserOptions.length && (
                    <optgroup label="Web">
                      {BrowserOptions.map(({ name, label }) => (
                        <option key={name} value={name}>
                          {label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4 mt-auto">
                <Button
                  type="submit"
                  size="touch"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Search className="size-4" />
                  <span>{t('common.search')}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="touch"
                  className="flex-1 flex items-center justify-center gap-2"
                  onClick={() => {
                    handleReset();
                    setMobileFilterOpen(false);
                  }}
                >
                  <RotateCcw className="size-4" />
                  <span>{t('common.reset')}</span>
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
};

export default RoomList;
