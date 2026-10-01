import copy from 'copy-to-clipboard';
import React, { memo, useEffect, useMemo, useState } from 'react';
import ConsolePanel from './ConsolePanel';
import NetworkPanel from './NetworkPanel';
import SystemPanel from './SystemPanel';
import { useNavigate, useLocation } from 'react-router-dom';
import PagePanel from './PagePanel';
import clsx from 'clsx';
import './index.less';
import { StoragePanel } from './StoragePanel';
import useSearch from '@/utils/useSearch';
import { useEventListener } from '@/utils/useEventListener';
import { useTranslation } from 'react-i18next';
import { ConnectStatus } from './ConnectStatus';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
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
import { Copy, Download, Trash2, Settings } from 'lucide-react';

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

interface BadgeMenuProps {
  active: MenuType;
  badge: Record<MenuType, boolean>;
}
const BadgeMenu = memo(({ active, badge }: BadgeMenuProps) => {
  const { t } = useTranslation('translation', { keyPrefix: 'devtool' });
  const navigate = useNavigate();
  const { search } = useLocation();

  const clientInfo = useSocketMessageStore(
    useShallow((state) => state.clientInfo),
  );
  const visibleMenus = useVisibleMenus();

  if (!clientInfo) {
    return (
      <div className="space-y-2 p-2">
        {Object.keys(MENU_COMPONENTS).map((_, index) => (
          <div
            key={index}
            className="h-8 bg-muted rounded animate-pulse w-[90%] mx-auto"
          />
        ))}
      </div>
    );
  }

  return (
    <nav className="sider-menu flex flex-col gap-1 p-2">
      {visibleMenus.map((key) => (
        <button
          key={key}
          type="button"
          className={clsx(
            'sider-menu__item w-full flex items-center justify-between px-3 py-2 text-sm rounded-md text-left transition-colors cursor-pointer',
            active === key
              ? 'bg-secondary text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
          )}
          onClick={() => {
            navigate({ search, hash: key });
          }}
        >
          <span>{t(`menu.${key}`)}</span>
          <div
            className={clsx('circle-badge', {
              show: badge[key as MenuType],
            })}
          />
        </button>
      ))}
    </nav>
  );
});

const ClientInfo = memo(() => {
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

  return (
    <div className="client-info p-3 text-center">
      <h4 className="text-sm font-semibold tracking-tight my-2">
        {t('device')}
      </h4>
      <div className="flex items-center justify-around py-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="cursor-pointer">
                <img
                  className="client-info__logo w-8 h-8 mx-auto"
                  src={clientInfo?.os.logo}
                  alt={clientInfo?.os.name}
                />
              </div>
            }
          />
          <TooltipContent>
            <span>
              {t('system')}: {clientInfo?.os.name}
            </span>
            <br />
            <span>
              {t('version')}: {clientInfo?.os.version}
            </span>
          </TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="h-6" />
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="cursor-pointer">
                <img
                  className="client-info__logo w-8 h-8 mx-auto"
                  src={clientInfo?.browser.logo}
                  alt={clientInfo?.browser.name}
                />
              </div>
            }
          />
          <TooltipContent>
            <span>
              {t('platform')}: {clientInfo?.browser.name}
            </span>
            <br />
            <span>
              {t('version')}: {clientInfo?.browser.version}
            </span>
          </TooltipContent>
        </Tooltip>
      </div>
      <Separator className="my-2" />
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="page-spy-id text-xs font-mono font-bold cursor-pointer my-1">
              #{address.slice(0, 4)}
            </div>
          }
        />
        <TooltipContent>Device ID</TooltipContent>
      </Tooltip>
      <div className="client-info__actions flex flex-col gap-2 mt-2">
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs h-8"
          onClick={copyAllLogs}
        >
          <Copy className="h-3.5 w-3.5 mr-1" />
          {t('copy-all')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs h-8"
          onClick={downloadAllLogs}
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          {t('download')}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="w-full text-xs h-8"
          onClick={() => setClearConfirmOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          {t('clear-panel-logs')}
        </Button>
      </div>

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
              size="sm"
              onClick={() => setClearConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={clearPanelLogs}>
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default function Devtools() {
  const { hash = '#Console' } = useLocation();
  const { address = '', secret = '' } = useSearch();
  const { t } = useTranslation('translation', { keyPrefix: 'devtool' });
  const navigate = useNavigate();
  const { search } = useLocation();
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  const [socket, initSocket, clientInfo] = useSocketMessageStore(
    useShallow((state) => [state.socket, state.initSocket, state.clientInfo]),
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

  return (
    <div className="page-spy-devtools-root flex flex-col h-full overflow-hidden">
      {/* Main Layout (Sider on left on desktop, hidden on mobile via CSS) */}
      <div className="page-spy-devtools flex flex-1 overflow-hidden">
        <aside className="devtools-desktop-sider w-56 shrink-0 border-r border-border bg-card flex flex-col overflow-y-auto">
          <div className="page-spy-devtools__sider">
            <ClientInfo />
            <BadgeMenu active={hashKey} badge={badge} />
          </div>
        </aside>
        <main className="page-spy-devtools__content flex-1 flex flex-col min-w-0 overflow-hidden">
          <ConnectStatus />
          <div className="page-spy-devtools__panel flex-1 overflow-hidden">
            <ActiveContent />
          </div>
        </main>
      </div>

      {/* Floating Action Button (FAB) for mobile */}
      <div
        className="devtools-floating-fab cursor-pointer flex items-center justify-center"
        onClick={() => setBottomSheetOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setBottomSheetOpen(true);
          }
        }}
        role="button"
        tabIndex={0}
        title="Open Side Panel & Actions"
      >
        <Settings className="w-5 h-5 text-white" />
        {Object.values(badge).some(Boolean) && (
          <span className="fab-badge-dot" />
        )}
      </div>

      {/* Mobile BottomSheet Drawer for Side Panel */}
      <Sheet open={bottomSheetOpen} onOpenChange={setBottomSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto p-4">
          <SheetHeader className="pb-3 border-b border-border">
            <SheetTitle className="flex items-center justify-between">
              <span>{t('device')} &amp; Side Panel</span>
              <Badge variant="secondary" className="font-mono font-bold">
                #{address.slice(0, 4)}
              </Badge>
            </SheetTitle>
          </SheetHeader>
          <div className="mobile-bottomsheet-body py-4 space-y-4">
            <div className="bottomsheet-panel-switcher">
              <span className="text-xs text-muted-foreground block mb-2 font-medium">
                Switch Panel
              </span>
              <div className="bottomsheet-panel-buttons flex flex-wrap gap-2">
                {visibleMenus.map((key) => (
                  <Button
                    key={key}
                    size="touch"
                    variant={key === hashKey ? 'default' : 'outline'}
                    onClick={() => {
                      navigate({ search, hash: key });
                      setBottomSheetOpen(false);
                    }}
                    className="rounded-full"
                  >
                    {t(`menu.${key}`)}
                    {badge[key] && (
                      <span className="tab-circle-badge ml-1 inline-block w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
            <Separator />
            <ClientInfo />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
