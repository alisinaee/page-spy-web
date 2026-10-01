import copy from 'copy-to-clipboard';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import ConsolePanel from './ConsolePanel';
import NetworkPanel from './NetworkPanel';
import SystemPanel from './SystemPanel';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import PagePanel from './PagePanel';
import clsx from 'clsx';
import { StoragePanel } from './StoragePanel';
import useSearch from '@/utils/useSearch';
import { useEventListener } from '@/utils/useEventListener';
import { useTranslation } from 'react-i18next';
import { ConnectStatus, ConnectDetail } from './ConnectStatus';
import { useSocketMessageStore } from '@/store/socket-message';
import '@huolala-tech/react-json-view/dist/style.css';
import { throttle } from 'lodash-es';
import { CUSTOM_EVENT } from '@/store/socket-message/socket';
import { SpyClient } from '@huolala-tech/page-spy-types';
import { isBrowser } from '@/store/platform-config';
import { useShallow } from 'zustand/react/shallow';
import {
  downloadDeviceSession,
  serializeDeviceSession,
  suggestDeviceLogName,
} from '@/utils/device-session';
import { confirmLogFileName } from './save-log-dialog';
import { message } from '@/utils/message';
import { Button } from '@/components/ui/button';
import { PaneResizeHandle, usePaneWidth } from '@/components/panel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  Copy,
  Cpu,
  Database,
  Download,
  Globe,
  MonitorSmartphone,
  MoreHorizontal,
  MoreVertical,
  Terminal,
  Trash2,
  type LucideIcon,
} from 'lucide-react';

type MenuType = 'Console' | 'Network' | 'Page' | 'Storage' | 'System';

const MENU_COMPONENTS: Record<
  MenuType,
  {
    component: React.FC;
    visible?: (params: {
      browser: SpyClient.Browser;
      os: SpyClient.OS;
    }) => boolean;
  }
> = {
  Console: {
    component: ConsolePanel,
  },
  Network: {
    component: NetworkPanel,
  },
  Page: {
    component: PagePanel,
    visible: ({ browser }) => {
      return isBrowser(browser);
    },
  },
  Storage: {
    component: StoragePanel,
  },
  System: {
    component: SystemPanel,
    visible: ({ browser }) => {
      return isBrowser(browser);
    },
  },
};

const useDevtoolsBadge = (active: MenuType) => {
  const [badge, setBadge] = useState<Record<MenuType, boolean>>({
    Console: false,
    Network: false,
    Page: false,
    Storage: false,
    System: false,
  });

  useEventListener(
    CUSTOM_EVENT.NewMessageComing,
    throttle((evt) => {
      const { detail } = evt as CustomEvent;
      const type = `${(detail as string)[0].toUpperCase()}${detail.slice(
        1,
      )}` as MenuType;
      if (type !== active) {
        setBadge((prev) => ({
          ...prev,
          [type]: true,
        }));
      }
    }, 100),
  );

  useEffect(() => {
    setBadge((prev) => ({
      ...prev,
      [active]: false,
    }));
  }, [active]);

  return badge;
};

const useVisibleMenus = () => {
  const clientInfo = useSocketMessageStore(
    useShallow((state) => state.clientInfo),
  );
  return useMemo(() => {
    if (!clientInfo) return Object.keys(MENU_COMPONENTS) as MenuType[];
    return (Object.keys(MENU_COMPONENTS) as MenuType[]).filter((key) => {
      const item = MENU_COMPONENTS[key];
      return (
        !item.visible ||
        item.visible({
          browser: clientInfo.browser.type,
          os: clientInfo.os.type,
        })
      );
    });
  }, [clientInfo]);
};

const MENU_ICONS: Record<MenuType, LucideIcon> = {
  Console: Terminal,
  Network: Globe,
  Storage: Database,
  System: Cpu,
  Page: MonitorSmartphone,
};
const TAB_MENUS: MenuType[] = ['Console', 'Network', 'Storage', 'System'];

const UnreadDot = ({
  label,
  className,
}: {
  label: string;
  className?: string;
}) => (
  <>
    <span
      className={clsx('size-2 shrink-0 rounded-full bg-destructive', className)}
      aria-hidden
    />
    <span className="sr-only">{label}</span>
  </>
);

interface MenuProps {
  active: MenuType;
  badge: Record<MenuType, boolean>;
  menus: MenuType[];
  onSelect: (key: MenuType) => void;
}

const SideNav = memo(({ active, badge, menus, onSelect }: MenuProps) => {
  const { t } = useTranslation('translation', { keyPrefix: 'devtool' });
  const frameRef = useRef<HTMLDivElement>(null);
  const pane = usePaneWidth({
    storageKey: 'sidebar',
    fallback: 208,
    min: 168,
    max: 360,
    reserve: 480,
    frameRef,
  });
  return (
    <div
      ref={frameRef}
      style={{ width: pane.width }}
      className="relative hidden shrink-0 md:block"
    >
      <nav className="flex h-full flex-col gap-1 border-r border-border bg-card p-2">
        {menus.map((key) => {
          const Icon = MENU_ICONS[key];
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                isActive
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
              onClick={() => onSelect(key)}
            >
              {isActive && (
                <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary" />
              )}
              <Icon className="size-4 shrink-0" />
              <span className="flex-1 truncate">{t(`menu.${key}`)}</span>
              {badge[key] && <UnreadDot label={t('new-activity')} />}
            </button>
          );
        })}
      </nav>
      <PaneResizeHandle
        label={t('resize-sidebar', { defaultValue: 'Resize sidebar' })!}
        edge="end"
        value={pane.width}
        min={pane.min}
        max={pane.max}
        onChange={pane.setWidth}
        onReset={pane.reset}
      />
    </div>
  );
});

const tabClass = (isActive: boolean) =>
  clsx(
    'relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
    isActive ? 'text-primary-text' : 'text-muted-foreground',
  );

const TabBar = memo(({ active, badge, menus, onSelect }: MenuProps) => {
  const { t } = useTranslation('translation', { keyPrefix: 'devtool' });
  const tabs = menus.filter((key) => TAB_MENUS.includes(key));
  const more = menus.filter((key) => !TAB_MENUS.includes(key));
  const moreActive = more.includes(active);
  const moreBadge = more.some((key) => badge[key]);

  return (
    <nav className="flex h-[calc(3.5rem+env(safe-area-inset-bottom))] shrink-0 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
      {tabs.map((key) => {
        const Icon = MENU_ICONS[key];
        const isActive = active === key;
        return (
          <button
            key={key}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            className={tabClass(isActive)}
            onClick={() => onSelect(key)}
          >
            {isActive && (
              <span className="absolute inset-x-3 top-0 h-0.5 bg-primary" />
            )}
            <span className="relative">
              <Icon className="size-5" />
              {badge[key] && (
                <UnreadDot
                  label={t('new-activity')}
                  className="absolute -right-1 -top-1"
                />
              )}
            </span>
            <span>{t(`menu.${key}`)}</span>
          </button>
        );
      })}
      {more.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={tabClass(moreActive)}
            aria-label={String(t('more'))}
          >
            {moreActive && (
              <span className="absolute inset-x-3 top-0 h-0.5 bg-primary" />
            )}
            <span className="relative">
              <MoreHorizontal className="size-5" />
              {moreBadge && (
                <UnreadDot
                  label={t('new-activity')}
                  className="absolute -right-1 -top-1"
                />
              )}
            </span>
            <span>{t('more')}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="min-w-40">
            {more.map((key) => {
              const Icon = MENU_ICONS[key];
              return (
                <DropdownMenuItem
                  key={key}
                  className="min-h-[44px] gap-3 px-3 text-sm"
                  onClick={() => onSelect(key)}
                >
                  <Icon />
                  <span className="flex-1">{t(`menu.${key}`)}</span>
                  {badge[key] && <UnreadDot label={t('new-activity')} />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  );
});

const useIsDesktop = () => {
  const [desktop, setDesktop] = useState(
    () => window.matchMedia('(min-width: 768px)').matches,
  );
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const listener = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);
  return desktop;
};

const TopBar = memo(() => {
  const { t } = useTranslation('translation', { keyPrefix: 'devtool' });
  const { address = '' } = useSearch();
  const clientInfo = useSocketMessageStore(
    useShallow((state) => state.clientInfo),
  );
  const socket = useSocketMessageStore((state) => state.socket);
  const clearDeviceSession = useSocketMessageStore(
    (state) => state.clearDeviceSession,
  );
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const isDesktop = useIsDesktop();

  const copyAllLogs = () => {
    try {
      const copied = copy(serializeDeviceSession(address));
      if (copied) {
        message.success(t('copy-all-success'));
      } else {
        message.error(t('copy-all-error'));
      }
    } catch (error) {
      console.error('Failed to copy device session', error);
      message.error(t('copy-all-error'));
    }
  };

  const downloadAllLogs = async () => {
    try {
      const fileName = await confirmLogFileName(
        suggestDeviceLogName(address, 'all'),
      );
      if (!fileName) return;
      await downloadDeviceSession(address, fileName);
      message.success(t('download-success'));
    } catch (error) {
      console.error('Failed to download device session', error);
      message.error(t('export-error'));
    }
  };

  const clearPanelLogs = () => {
    clearDeviceSession();
    socket?.unicastMessage({
      type: 'debug',
      data: 'console.clear()',
    });
    setClearConfirmOpen(false);
    message.success(t('clear-success'));
  };

  const os = clientInfo?.os;
  const browser = clientInfo?.browser;

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-2">
      <Button
        variant="ghost"
        size="icon-touch"
        className="md:size-9"
        aria-label={String(t('back'))}
        nativeButton={false}
        render={<Link to="/room-list" />}
      >
        <ChevronLeft />
      </Button>

      <button
        type="button"
        className="min-w-0 flex-1 rounded-lg px-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => setInfoOpen(true)}
        aria-label={String(t('device-info'))}
      >
        <div className="truncate font-mono text-sm font-semibold">
          {address}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {os && browser
            ? `${os.name}${os.version ? ' ' + os.version : ''} · ${
                browser.name
              } ${browser.version}`
            : '\u00a0'}
        </div>
      </button>

      <ConnectStatus />

      <Button
        variant="ghost"
        size="icon-touch"
        className="md:size-9"
        title={String(t('download'))}
        aria-label={String(t('download'))}
        onClick={() => {
          void downloadAllLogs();
        }}
      >
        <Download />
      </Button>
      <Button
        variant="ghost"
        size="icon-touch"
        className="md:size-9"
        title={String(t('clear-panel-logs'))}
        aria-label={String(t('clear-panel-logs'))}
        onClick={() => setClearConfirmOpen(true)}
      >
        <Trash2 />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-touch"
              className="md:size-9"
              aria-label={String(t('more-actions'))}
            />
          }
        >
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem
            className="min-h-[44px] gap-3 px-3 md:min-h-8"
            onClick={copyAllLogs}
          >
            <Copy />
            {t('copy-all')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-[44px] gap-3 px-3 md:min-h-8"
            onClick={downloadAllLogs}
          >
            <Download />
            {t('download')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="min-h-[44px] gap-3 px-3 md:min-h-8"
            onClick={() => setClearConfirmOpen(true)}
          >
            <Trash2 />
            {t('clear-panel-logs')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent
          side={isDesktop ? 'right' : 'bottom'}
          className="max-h-[85dvh] overflow-y-auto p-4"
        >
          <SheetHeader className="p-0">
            <SheetTitle className="text-base font-semibold">
              {t('device-info')}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {t('device')}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-4">
              {os && (
                <div className="flex min-w-0 items-center gap-2">
                  <img
                    className="size-8 shrink-0"
                    src={os.logo}
                    alt={`${t('system')}: ${os.name}`}
                  />
                  <div className="min-w-0 text-sm">
                    <div className="truncate font-medium">{os.name}</div>
                    {os.version ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {os.version}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
              {browser && (
                <div className="flex min-w-0 items-center gap-2">
                  <img
                    className="size-8 shrink-0"
                    src={browser.logo}
                    alt={`${t('platform')}: ${browser.name}`}
                  />
                  <div className="min-w-0 text-sm">
                    <div className="truncate font-medium">{browser.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {browser.version}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground">
                {t('device-id')}
              </div>
              <div className="break-words font-mono text-sm">{address}</div>
            </div>

            {clientInfo && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  SDK
                </div>
                <div className="text-sm">
                  {[clientInfo.sdk, clientInfo.framework]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
                {clientInfo.plugins.length > 0 && (
                  <div className="break-words text-xs text-muted-foreground">
                    {clientInfo.plugins.join(', ')}
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                {t('connection')}
              </div>
              <ConnectDetail />
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="touch"
                className="w-full md:h-9 md:text-sm"
                onClick={copyAllLogs}
              >
                <Copy />
                {t('copy-all')}
              </Button>
              <Button
                variant="outline"
                size="touch"
                className="w-full md:h-9 md:text-sm"
                onClick={downloadAllLogs}
              >
                <Download />
                {t('download')}
              </Button>
              <Button
                variant="destructive"
                size="touch"
                className="w-full md:h-9 md:text-sm"
                onClick={() => setClearConfirmOpen(true)}
              >
                <Trash2 />
                {t('clear-panel-logs')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t('clear-confirm-title')}</DialogTitle>
            <DialogDescription>
              {t('clear-confirm-description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              size="touch"
              className="md:h-9 md:text-sm"
              onClick={() => setClearConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="touch"
              className="md:h-9 md:text-sm"
              onClick={clearPanelLogs}
            >
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
});

export default function Devtools() {
  const { hash = '#Console' } = useLocation();
  const { address = '', secret = '' } = useSearch();
  const navigate = useNavigate();
  const { search } = useLocation();

  const [socket, initSocket] = useSocketMessageStore(
    useShallow((state) => [state.socket, state.initSocket]),
  );

  useEffect(() => {
    if (socket) return;
    initSocket({ address, secret });
  }, [address, initSocket, secret, socket]);

  const hashKey = useMemo<MenuType>(() => {
    const value = hash.slice(1);
    if (!(value in MENU_COMPONENTS)) {
      return 'Console';
    }
    return value as MenuType;
  }, [hash]);

  const badge = useDevtoolsBadge(hashKey);
  const visibleMenus = useVisibleMenus();
  const ActiveContent = useMemo(() => {
    const content = MENU_COMPONENTS[hashKey];
    return content.component || ConsolePanel;
  }, [hashKey]);

  if (!address) {
    message.error('Error url params!');
    return null;
  }

  const onSelect = (key: MenuType) => navigate({ search, hash: key });

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <SideNav
          active={hashKey}
          badge={badge}
          menus={visibleMenus}
          onSelect={onSelect}
        />
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden [&>div]:h-full">
          <ActiveContent />
        </main>
      </div>
      <TabBar
        active={hashKey}
        badge={badge}
        menus={visibleMenus}
        onSelect={onSelect}
      />
    </div>
  );
}
