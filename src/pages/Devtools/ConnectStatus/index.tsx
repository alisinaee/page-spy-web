import { SpySocket } from '@huolala-tech/page-spy-types';
import { memo, useEffect, useState } from 'react';
import './index.less';
import UserSvg from '@/assets/image/user-1.svg?react';
import { useTranslation } from 'react-i18next';
import { useSocketMessageStore } from '@/store/socket-message';
import { CUSTOM_EVENT } from '@/store/socket-message/socket';
import { useShallow } from 'zustand/react/shallow';
import { Separator } from '@/components/ui/separator';

interface ConnectionStatus {
  client?: SpySocket.Connection | null;
  debug?: SpySocket.Connection | null;
}

const UserStatus = ({ online }: { online: boolean }) => {
  return (
    <UserSvg
      className="size-4"
      style={{
        color: online ? '#2fbf2f' : '#aaa',
      }}
    />
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
    <div className="connect-status flex justify-center items-center py-1">
      <div className="connect-status-widget flex items-center gap-3 px-3 py-1 bg-card/60 border border-border/40 rounded-full text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <UserStatus online={!!connections.debug} />
          <span>{t('socket.debug-name')}</span>
        </div>
        <Separator orientation="vertical" className="h-3.5 bg-border/60" />
        <div className="flex items-center gap-1.5">
          <UserStatus online={!!connections.client} />
          <span>{t('socket.client-name')}</span>
        </div>
      </div>
    </div>
  );
});
