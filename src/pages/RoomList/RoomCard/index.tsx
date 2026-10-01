import { parseUserAgent } from '@/utils/brand';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import clsx from 'clsx';
import { DebugButton } from '../DebugButton';
import { PropsWithChildren, memo } from 'react';

interface Props {
  room: I.SpyRoom;
}

const ConnDetailItem = ({
  title,
  children,
}: PropsWithChildren<{ title: string }>) => {
  return (
    <div className="conn-detail flex-1 min-w-0">
      <p className="conn-detail__title text-xs text-muted-foreground m-0">
        {title}
      </p>
      <div className="conn-detail__value mt-1">{children}</div>
    </div>
  );
};

export const RoomCard = memo(
  ({ room }: Props) => {
    const { address, name, group, tags } = room;
    const decodeGroup = decodeURI(group);
    const simpleAddress = address.slice(0, 4);
    const { os, browser } = parseUserAgent(name);

    return (
      <div
        key={address}
        className="w-full sm:w-full md:w-1/2 lg:w-1/2 xl:w-1/3 2xl:w-1/4 p-2"
      >
        <div
          className={clsx(
            'connection-item bg-card border border-border rounded-xl p-4 flex flex-col gap-3',
          )}
        >
          <div className="connection-item__title flex justify-between items-baseline gap-2">
            <code className="text-3xl font-mono font-bold text-foreground">
              <b>{simpleAddress}</b>
            </code>
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="custom-title text-sm text-muted-foreground truncate cursor-default" />
                }
              >
                {tags.title?.toString() || '--'}
              </TooltipTrigger>
              <TooltipContent side="right">
                {`Title: ${tags.title?.toString() || '--'}`}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center justify-between gap-3 my-2">
            <ConnDetailItem title="Project">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <p className="text-sm font-medium text-foreground truncate cursor-default m-0" />
                  }
                >
                  {decodeGroup}
                </TooltipTrigger>
                <TooltipContent>{decodeGroup}</TooltipContent>
              </Tooltip>
            </ConnDetailItem>
            <ConnDetailItem title="OS">
              <Tooltip>
                <TooltipTrigger
                  render={<div className="cursor-default inline-block" />}
                >
                  <img
                    src={os.logo}
                    alt="os logo"
                    className="h-6 w-auto object-contain"
                  />
                </TooltipTrigger>
                <TooltipContent>{`${os.name} ${os.version}`}</TooltipContent>
              </Tooltip>
            </ConnDetailItem>
            <ConnDetailItem title="Platform">
              <Tooltip>
                <TooltipTrigger
                  render={<div className="cursor-default inline-block" />}
                >
                  <img
                    src={browser.logo}
                    alt="browser logo"
                    className="h-6 w-auto object-contain"
                  />
                </TooltipTrigger>
                <TooltipContent>{`${browser.name} ${browser.version}`}</TooltipContent>
              </Tooltip>
            </ConnDetailItem>
          </div>
          <DebugButton room={room} />
        </div>
      </div>
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
