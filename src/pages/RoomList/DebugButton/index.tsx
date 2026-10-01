import { usePopupRef } from '@/utils/withPopup';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useHref } from 'react-router-dom';
import { IArgs, SecretModal } from './SecretModal';
import LockSvg from '@/assets/image/lock.svg?react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface Props {
  room: I.SpyRoom;
}

export const DebugButton = ({ room }: Props) => {
  const { t } = useTranslation();
  const { connections, address, useSecret } = room;
  const client = connections.find(({ userId }) => userId === 'Client');
  const modalRef = usePopupRef<IArgs, string>();
  const devtoolPath = useHref('/devtools');

  const startDebug = useCallback(async () => {
    try {
      if (useSecret) {
        const secret = await modalRef.current?.popup({
          address,
        });
        window.open(`${devtoolPath}?address=${address}&secret=${secret}`);
      } else {
        window.open(`${devtoolPath}?address=${address}`);
      }
    } catch (e) {}
  }, [address, devtoolPath, modalRef, useSecret]);

  const buttonElement = (
    <Button
      variant="default"
      size="touch"
      disabled={!client}
      className="w-full rounded-full flex items-center justify-center gap-2 font-medium"
      onClick={startDebug}
    >
      {room.useSecret && <LockSvg className="size-4" />}
      <span>{t('common.debug')}</span>
    </Button>
  );

  return (
    <div>
      {!client ? (
        <Tooltip>
          <TooltipTrigger
            render={<span className="block w-full cursor-not-allowed" />}
          >
            {buttonElement}
          </TooltipTrigger>
          <TooltipContent>
            {t('socket.client-not-in-connection')}
          </TooltipContent>
        </Tooltip>
      ) : (
        buttonElement
      )}
      <SecretModal ref={modalRef} />
    </div>
  );
};
