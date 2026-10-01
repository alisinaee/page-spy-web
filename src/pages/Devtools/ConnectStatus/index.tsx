import { SpySocket } from '@huolala-tech/page-spy-types';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSocketMessageStore } from '@/store/socket-message';
import { CUSTOM_EVENT } from '@/store/socket-message/socket';
import { useShallow } from 'zustand/react/shallow';
import clsx from 'clsx';

interface ConnectionStatus {
  client?: SpySocket.Connection | null;
  debug?: SpySocket.Connection | null;
}

const useConnections = () => {
  const socket = useSocketMessageStore(useShallow((state) => state.socket));
  const [connections, setConnections] = useState<ConnectionStatus>(() => ({
    client: socket?.clientConnection,
    debug: socket?.socketConnection,
  }));

  useEffect(() => {
    if (!socket) return;
    const statusListener: EventListener = (evt) => {
      const { detail } = evt as CustomEvent<ConnectionStatus>;
      setConnections(detail);
    };
    socket.addEventListener(CUSTOM_EVENT.ConnectStatus, statusListener);
    return () => {
      socket.removeEventListener(CUSTOM_EVENT.ConnectStatus, statusListener);
    };
  }, [socket]);

  return connections;
};

const StatusItem = ({ online, name }: { online: boolean; name: string }) => (
  <div
    className={clsx(
      'flex items-center gap-2 text-sm',
      online ? 'text-success' : 'text-muted-foreground',
    )}
  >
    <span className="size-2 rounded-full bg-current" />
    <span>{name}</span>
  </div>
);

/** Compact "Live / Offline" pill for the top bar. */
export const ConnectStatus = memo(() => {
  const { t } = useTranslation();
  const { client, debug } = useConnections();
  const live = !!client && !!debug;

  return (
    <div
      className={clsx(
        'flex shrink-0 items-center gap-1 text-xs font-medium',
        live ? 'text-success' : 'text-muted-foreground',
      )}
    >
      <span className="size-2 rounded-full bg-current" />
      <span>{live ? t('devtool.live') : t('devtool.offline')}</span>
    </div>
  );
});

/** You / Client detail, shown inside the device info sheet. */
export const ConnectDetail = memo(() => {
  const { t } = useTranslation();
  const { client, debug } = useConnections();

  return (
    <div className="flex flex-col gap-2">
      <StatusItem online={!!debug} name={t('socket.debug-name')} />
      <StatusItem online={!!client} name={t('socket.client-name')} />
    </div>
  );
});
