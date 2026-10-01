import { parseUserAgent } from '@/utils/brand';
import { Card } from '@/components/ui/card';
import { DebugButton } from '../DebugButton';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  room: I.SpyRoom;
}

export const RoomCard = memo(
  ({ room }: Props) => {
    const { t } = useTranslation();
    const { address, name, group, tags } = room;
    const decodeGroup = decodeURI(group);
    const simpleAddress = address.slice(0, 4);
    const { os, browser } = parseUserAgent(name);
    const title = tags.title?.toString() || '--';
    const osName = `${os.name} ${os.version}`.trim();
    const browserName = `${browser.name} ${browser.version}`.trim();

    return (
      <Card className="gap-3 p-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <code className="font-mono text-base font-semibold text-foreground">
              {simpleAddress}
            </code>
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full bg-success"
            />
            <span className="sr-only">
              {t('common.online', { defaultValue: 'online' })}
            </span>
          </div>
          <p
            className="m-0 truncate text-sm text-muted-foreground"
            title={title}
          >
            {title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1">
            <img
              src={os.logo}
              alt={os.name}
              className="size-4 shrink-0 object-contain"
            />
            <span className="sr-only">
              {t('common.os', { defaultValue: 'OS' })}:
            </span>
            {osName}
          </span>
          <span className="flex min-w-0 items-center gap-1">
            <img
              src={browser.logo}
              alt={browser.name}
              className="size-4 shrink-0 object-contain"
            />
            <span className="sr-only">
              {t('devtool.platform', { defaultValue: 'Platform' })}:
            </span>
            {browserName}
          </span>
          <span className="min-w-0 truncate" title={decodeGroup}>
            <span className="sr-only">
              {t('common.project', { defaultValue: 'Project' })}:
            </span>
            {decodeGroup}
          </span>
        </div>
        <DebugButton room={room} />
      </Card>
    );
  },
  ({ room: old }, { room: now }) => {
    if (
      old.name !== now.name ||
      old.group !== now.group ||
      old.address !== now.address ||
      old.tags.title !== now.tags.title ||
      old.connections.length !== now.connections.length
    )
      return false;
    return true;
  },
);
