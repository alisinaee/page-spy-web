import { SpySocket } from '@huolala-tech/page-spy-types';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSocketMessageStore } from '@/store/socket-message';
import { CUSTOM_EVENT } from '@/store/socket-message/socket';
import { useShallow } from 'zustand/react/shallow';
import { Separator } from '@/components/ui/separator';
import clsx from 'clsx';

interface ConnectionStatus {
  client?: SpySocket.Connection | null;
  debug?: SpySocket.Connection | null;
}

const StatusItem = ({ online, name }: { online: boolean; name: string }) => {
  return (
    <div
      className={clsx(
        'flex items-center gap-1.5',
        online ? 'text-success' : 'text-muted-foreground',
      )}
    >
      <span className="size-2 rounded-full bg-current" />
      <span>{name}</span>
    </div>
  );
};

export const ConnectStatus = memo(() => {
  const { t } = useTranslation();
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

  return (
    <div className="connect-status flex justify-center items-center py-1 shrink-0">
      <div className="connect-status-widget flex items-center gap-3 px-3 py-1 bg-card border border-border rounded-full text-xs">
        <StatusItem
          online={!!connections.debug}
          name={t('socket.debug-name')}
        />
        <Separator orientation="vertical" className="h-3.5" />
        <StatusItem
          online={!!connections.client}
          name={t('socket.client-name')}
        />
      </div>
    </div>
  );
});
