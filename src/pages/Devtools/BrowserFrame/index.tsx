import type { PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';
import CellularSVG from '@/assets/image/cellular.svg?react';
import BatterySVG from '@/assets/image/battery.svg?react';
import DeviceSVG from '@/assets/image/device.svg?react';
import './index.less';
import { ElementPanel } from '../ElementPanel';
import { useTranslation } from 'react-i18next';
import { useSocketMessageStore } from '@/store/socket-message';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { RotateCw, PanelLeft, Loader2 } from 'lucide-react';

function getTime() {
  const date = new Date();
  let hours = String(date.getHours());
  hours = Number(hours) >= 10 ? hours : `0${hours}`;
  let mins = String(date.getMinutes());
  mins = Number(mins) >= 10 ? mins : `0${mins}`;
  return [hours, mins].join(':');
}

interface FrameWrapperProps {
  os?: 'iOS' | 'Android';
  loading: boolean;
  onRefresh: () => void;
}

export const PCFrame = ({
  children,
  loading,
  onRefresh,
}: PropsWithChildren<FrameWrapperProps>) => {
  const { t: ct } = useTranslation('translation', { keyPrefix: 'common' });
  const { t } = useTranslation('translation', { keyPrefix: 'page' });
  const [pageLocation, clientInfo] = useSocketMessageStore(
    useShallow((state) => [state.pageMsg.location, state.clientInfo]),
  );
  const [elementVisible, setElementVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dividerRef = useRef<HTMLDivElement | null>(null);
  const utilsRef = useRef<HTMLDivElement | null>(null);
  const xAxisRef = useRef(0);
  const [width, setWidth] = useState<string | number>('40%');

  useEffect(() => {
    if (!elementVisible) {
      return;
    }
    const clientIframe = document.querySelector(
      '.client-iframe',
    ) as HTMLIFrameElement;
    const containerArea = containerRef.current;
    const dividerLine = dividerRef.current;
    const utilsArea = utilsRef.current;
    let rightWidth = 0;
    let containerWidth = 0;
    let MAX_SIZE = 0;
    let MIN_SIZE = 0;
    function getClientX(e: MouseEvent | TouchEvent): number {
      if ('touches' in e && e.touches.length > 0) {
        return e.touches[0].clientX;
      }
      return (e as MouseEvent).clientX;
    }
    function start(e: MouseEvent | TouchEvent) {
      if (e.cancelable) e.preventDefault();
      // `mousemove`/`touchmove` not working when meet iframe
      if (clientIframe) clientIframe.style.pointerEvents = 'none';
      containerWidth = containerArea?.getBoundingClientRect().width || 0;
      MAX_SIZE = containerWidth * 0.6;
      MIN_SIZE = containerWidth * 0.4;
      rightWidth = utilsArea?.getBoundingClientRect().width || 0;
      const clientX = getClientX(e);
      xAxisRef.current = clientX;
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', end);
      document.addEventListener('touchmove', move, { passive: false });
      document.addEventListener('touchend', end);
      document.addEventListener('touchcancel', end);
    }
    function move(e: MouseEvent | TouchEvent) {
      if (e.cancelable) e.preventDefault();
      const clientX = getClientX(e);
      const diffX = Number(
        (rightWidth - (clientX - xAxisRef.current)).toFixed(2),
      );
      if (diffX > MAX_SIZE || diffX < MIN_SIZE) return;
      setWidth(diffX);
    }
    function end() {
      xAxisRef.current = 0;
      // reset `pointerEvents` when mouse/touch up
      if (clientIframe) clientIframe.style.pointerEvents = 'auto';
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', end);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', end);
    }
    dividerLine?.addEventListener('mousedown', start);
    dividerLine?.addEventListener('touchstart', start, { passive: false });
    // eslint-disable-next-line consistent-return
    return () => {
      dividerLine?.removeEventListener('mousedown', start);
      dividerLine?.removeEventListener('touchstart', start);
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', end);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', end);
    };
  }, [elementVisible]);

  const [enableDevice, setEnableDevice] = useState(false);

  useEffect(() => {
    if (!clientInfo) return;
    if (['ios', 'ipad', 'android'].indexOf(clientInfo.os.type) >= 0) {
      setEnableDevice(true);
      onRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientInfo]);

  return (
    <div className="pc-frame" ref={containerRef}>
      <div className="pc-frame__top flex justify-between items-center px-3 py-1.5 border-b border-border/50">
        <div className="pc-frame__top-left flex items-center gap-1.5">
          <div className="function-circle close" />
          <div className="function-circle mini" />
          <div className="function-circle fullscreen" />
        </div>
        <div
          className="pc-frame__top-center text-xs truncate max-w-sm px-2 text-muted-foreground"
          title={pageLocation?.href}
        >
          {pageLocation?.href || ''}
        </div>
        <div className="pc-frame__top-right flex items-center gap-1.5">
          <Button
            variant={elementVisible ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              setElementVisible(!elementVisible);
            }}
          >
            <PanelLeft className="size-3.5" />
            <span>{t('element')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              if (loading) return;
              onRefresh();
            }}
          >
            <RotateCw className="size-3.5" />
            <span>{ct('refresh')}</span>
          </Button>
          <Button
            variant={enableDevice ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              setEnableDevice((state) => !state);
              onRefresh();
            }}
          >
            <DeviceSVG className="size-3.5" />
            <span>{t('device')}</span>
          </Button>
        </div>
      </div>
      <div className="pc-frame__body spin-container relative">
        {loading && (
          <div className="absolute inset-0 bg-background/50 z-20 flex items-center justify-center backdrop-blur-xs">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}
        {enableDevice ? (
          <div className="mobile-frame">
            <div className="mobile-frame__body-content">{children}</div>
          </div>
        ) : (
          <div className="pc-frame__body-content">{children}</div>
        )}
        {elementVisible && (
          <>
            <div
              className="pc-frame__body-divider cursor-col-resize select-none"
              ref={dividerRef}
            />
            <div
              className="pc-frame__body-utils"
              ref={utilsRef}
              style={{ width }}
            >
              <div>
                <ElementPanel />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const IOSFrame = ({ children }: PropsWithChildren<unknown>) => {
  const time = getTime();
  const pageLocation = useSocketMessageStore(
    useShallow((state) => state.pageMsg.location),
  );
  return (
    <div className="ios-frame">
      <div className="ios-frame__hair">
        <div className="ios-top flex justify-between items-center">
          <p className="ios-top-left m-0">{time}</p>
          <div className="ios-top-center">
            <div className="ios-top-forehead" />
          </div>
          <div className="ios-top-right flex items-center gap-1">
            <CellularSVG className="size-3.5" />
            <BatterySVG className="ios-battery size-4" />
          </div>
        </div>
        <div className="ios-url">
          <div className="ios-url-input truncate" title={pageLocation?.href}>
            {pageLocation?.href}
          </div>
        </div>
      </div>
      <div className="ios-frame__content">{children}</div>
      <div className="ios-frame__bottom">
        <div className="ios-home" />
      </div>
    </div>
  );
};

const AndroidFrame = ({ children }: PropsWithChildren<unknown>) => {
  const time = getTime();
  const pageLocation = useSocketMessageStore(
    useShallow((state) => state.pageMsg.location),
  );

  return (
    <div className="android-frame">
      <div className="android-frame__camera" />
      <div className="android-frame__top flex justify-between items-center">
        <p className="android-frame__top-left m-0">{time}</p>
        <div className="android-frame__top-right flex items-center gap-1">
          <CellularSVG className="size-3.5" />
          <BatterySVG className="android-battery size-4" />
        </div>
      </div>

      <div className="android-url">
        <div className="android-url-input truncate" title={pageLocation?.href}>
          {pageLocation?.href}
        </div>
      </div>
      <div className="android-frame__content">{children}</div>
      <div className="android-frame__bottom">
        <div className="android-home" />
      </div>
    </div>
  );
};

export const MobileFrame = ({
  os,
  children,
  loading,
  onRefresh,
}: PropsWithChildren<FrameWrapperProps>) => {
  const { t: ct } = useTranslation();

  const PhoneFrame = os === 'iOS' ? IOSFrame : AndroidFrame;
  return (
    <div className="mobile-frame flex flex-col md:flex-row h-full">
      <div className="mobile-frame__left spin-container relative flex-1">
        {loading && (
          <div className="absolute inset-0 bg-background/50 z-20 flex items-center justify-center backdrop-blur-xs">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}
        <PhoneFrame>{children}</PhoneFrame>
      </div>
      <div className="mobile-frame__middle p-2 flex items-center justify-center">
        <Button
          variant="outline"
          size="touch"
          onClick={() => {
            if (loading) return;
            onRefresh();
          }}
        >
          {ct('refresh')}
        </Button>
      </div>
      <div className="mobile-frame__right spin-container relative flex-1">
        {loading && (
          <div className="absolute inset-0 bg-background/50 z-20 flex items-center justify-center backdrop-blur-xs">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}
        <ElementPanel />
      </div>
    </div>
  );
};
