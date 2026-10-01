import type { PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';
import CellularSVG from '@/assets/image/cellular.svg?react';
import BatterySVG from '@/assets/image/battery.svg?react';
import DeviceSVG from '@/assets/image/device.svg?react';
import './index.css';
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
    <div
      className="pc-frame flex flex-col w-full h-full overflow-hidden"
      ref={containerRef}
    >
      <div className="pc-frame__top flex shrink-0 grow-0 min-h-12 justify-between items-center px-5 py-2 bg-popover border border-border rounded-t-md">
        <div className="pc-frame__top-left flex items-center gap-1.5">
          <div className="function-circle close size-3 rounded-full bg-destructive" />
          <div className="function-circle mini size-3 rounded-full bg-warning" />
          <div className="function-circle fullscreen size-3 rounded-full bg-success" />
        </div>
        <div
          className="pc-frame__top-center text-xs truncate max-w-sm px-3 text-muted-foreground"
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
      <div className="pc-frame__body spin-container relative flex flex-1 h-0 overflow-hidden border border-t-0 border-border rounded-b-md bg-popover [&>div]:h-full [&>div]:overflow-auto">
        {loading && (
          <div className="absolute inset-0 bg-background/50 z-20 flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}
        {enableDevice ? (
          <div className="mobile-frame flex flex-1 justify-center items-center">
            <div className="mobile-frame__body-content relative h-[90%] aspect-[375/667]">
              {children}
            </div>
          </div>
        ) : (
          <div className="pc-frame__body-content flex-1">{children}</div>
        )}
        {elementVisible && (
          <>
            <div
              className="pc-frame__body-divider relative w-0.5 cursor-col-resize select-none touch-none bg-border transition-colors hover:bg-ring after:absolute after:inset-y-0 after:-left-[21px] after:-right-[21px] after:min-w-11 after:cursor-col-resize after:content-['']"
              ref={dividerRef}
            />
            <div
              className="pc-frame__body-utils relative"
              ref={utilsRef}
              style={{ width }}
            >
              <div className="absolute inset-0 py-2 pr-2 pl-1">
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
    <div className="ios-frame relative flex flex-col w-[282px] h-[609px] rounded-[40px] overflow-hidden border-[10px] border-muted [&_::-webkit-scrollbar]:w-0.5 [&_::-webkit-scrollbar-thumb]:bg-muted-foreground">
      <div className="ios-frame__hair">
        <div className="ios-top flex justify-between items-center h-[34px] bg-popover border-b border-border">
          <p className="ios-top-left m-0 basis-1/4 text-center text-xs font-bold text-foreground">
            {time}
          </p>
          <div className="ios-top-center basis-1/2 h-full">
            <div className="ios-top-forehead h-6 bg-muted rounded-b-[18px]" />
          </div>
          <div className="ios-top-right basis-1/4 h-full flex justify-center items-center gap-1 text-foreground">
            <CellularSVG className="size-3.5" />
            <BatterySVG className="ios-battery ml-2 size-4" />
          </div>
        </div>
        <div className="ios-url bg-popover p-1">
          <div
            className="ios-url-input truncate p-2 rounded-lg bg-muted text-muted-foreground text-xs"
            title={pageLocation?.href}
          >
            {pageLocation?.href}
          </div>
        </div>
      </div>
      <div className="ios-frame__content flex-1 h-0 overflow-auto">
        {children}
      </div>
      <div className="ios-frame__bottom absolute left-0 bottom-0 w-full h-5 text-center z-10">
        <div className="ios-home inline-block w-20 h-1 rounded bg-muted-foreground" />
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
    <div className="android-frame relative flex flex-col w-[282px] h-[609px] rounded-[40px] overflow-hidden border-[12px] border-x-4 border-muted [&_::-webkit-scrollbar]:w-0.5 [&_::-webkit-scrollbar-thumb]:bg-muted-foreground">
      <div className="android-frame__camera absolute right-3 top-3 z-10 flex justify-around items-center w-[50px] h-5 rounded-[22px] bg-muted before:size-2 before:rounded-full before:bg-muted-foreground before:content-[''] after:size-2 after:rounded-full after:bg-muted-foreground after:content-['']" />
      <div className="android-frame__top flex justify-between items-center h-[34px] pt-2.5 pr-[25%] pl-2.5 bg-popover border-b border-border">
        <p className="android-frame__top-left m-0 text-center text-foreground">
          {time}
        </p>
        <div className="android-frame__top-right basis-1/4 h-full flex justify-center items-center gap-1 text-foreground">
          <CellularSVG className="size-3.5" />
          <BatterySVG className="android-battery ml-2 size-4" />
        </div>
      </div>

      <div className="android-url bg-popover p-1">
        <div
          className="android-url-input truncate p-2 rounded-lg bg-muted text-muted-foreground text-xs"
          title={pageLocation?.href}
        >
          {pageLocation?.href}
        </div>
      </div>
      <div className="android-frame__content flex-1 h-0 overflow-auto">
        {children}
      </div>
      <div className="android-frame__bottom h-[30px] text-center z-10 bg-popover border-t border-border">
        <div className="android-home inline-block size-3.5 rounded border-2 border-muted-foreground align-bottom" />
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
    <div className="mobile-frame flex flex-col md:flex-row items-center h-full px-[50px] [&>div]:relative">
      <div className="mobile-frame__left spin-container relative z-10 flex-1">
        {loading && (
          <div className="absolute inset-0 bg-background/50 z-20 flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}
        <PhoneFrame>{children}</PhoneFrame>
      </div>
      <div className="mobile-frame__middle p-2 mx-[30px] flex items-center justify-center">
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
      <div className="mobile-frame__right spin-container relative z-10 flex-1 h-[609px] overflow-auto p-2 bg-card rounded-sm border border-border">
        {loading && (
          <div className="absolute inset-0 bg-background/50 z-20 flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}
        <ElementPanel />
      </div>
    </div>
  );
};
