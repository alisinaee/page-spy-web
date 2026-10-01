import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import DeviceSVG from '@/assets/image/device.svg?react';
import { ElementPanel } from '../ElementPanel';
import { useTranslation } from 'react-i18next';
import { useSocketMessageStore } from '@/store/socket-message';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { RotateCw, PanelLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsDesktop } from '@/components/panel';

interface FrameWrapperProps {
  loading: boolean;
  onRefresh: () => void;
}

const touchBtn = 'md:size-8 md:min-h-0 md:min-w-0';

/** The page preview: a minimal url bar on top, the iframe fills the rest. */
export const PCFrame = ({
  children,
  loading,
  onRefresh,
}: PropsWithChildren<FrameWrapperProps>) => {
  const { t: ct } = useTranslation('translation', { keyPrefix: 'common' });
  const { t } = useTranslation('translation', { keyPrefix: 'page' });
  const isDesktop = useIsDesktop();
  const [pageLocation, clientInfo] = useSocketMessageStore(
    useShallow((state) => [state.pageMsg.location, state.clientInfo]),
  );
  const [elementVisible, setElementVisible] = useState(false);
  const [enableDevice, setEnableDevice] = useState(false);

  useEffect(() => {
    if (!clientInfo) return;
    if (['ios', 'ipad', 'android'].indexOf(clientInfo.os.type) >= 0) {
      setEnableDevice(true);
      onRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientInfo]);

  // On phones the element tree replaces the preview instead of sharing it.
  const showPreview = isDesktop || !elementVisible;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-background px-2 py-1.5">
        <div
          className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 font-mono text-xs text-muted-foreground md:py-1.5"
          title={pageLocation?.href}
        >
          {pageLocation?.href || ''}
        </div>
        <Button
          variant={elementVisible ? 'secondary' : 'ghost'}
          size="icon-touch"
          aria-label={t('element')!}
          aria-pressed={elementVisible}
          className={touchBtn}
          onClick={() => setElementVisible(!elementVisible)}
        >
          <PanelLeft />
        </Button>
        <Button
          variant={enableDevice ? 'secondary' : 'ghost'}
          size="icon-touch"
          aria-label={t('device')!}
          aria-pressed={enableDevice}
          className={cn(touchBtn, 'max-md:hidden')}
          onClick={() => {
            setEnableDevice((state) => !state);
            onRefresh();
          }}
        >
          <DeviceSVG className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-touch"
          aria-label={ct('refresh')!}
          className={touchBtn}
          onClick={() => {
            if (loading) return;
            onRefresh();
          }}
        >
          <RotateCw />
        </Button>
      </div>
      <div className="relative flex min-h-0 flex-1 overflow-hidden bg-card">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}
        <div
          className={cn(
            'min-w-0 flex-1 overflow-auto',
            !showPreview && 'hidden',
            enableDevice && 'md:flex md:justify-center',
          )}
        >
          <div
            className={cn(
              'h-full w-full',
              enableDevice && 'md:max-w-[375px] md:border-x md:border-border',
            )}
          >
            {children}
          </div>
        </div>
        {elementVisible && (
          <div
            className={cn(
              'min-w-0 overflow-auto p-2',
              isDesktop ? 'w-2/5 shrink-0 border-l border-border' : 'flex-1',
            )}
          >
            <ElementPanel />
          </div>
        )}
      </div>
    </div>
  );
};
