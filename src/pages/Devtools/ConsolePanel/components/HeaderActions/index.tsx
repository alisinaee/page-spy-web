import { useSocketMessageStore } from '@/store/socket-message';
import React, { useMemo, useState } from 'react';
import { SpyConsole } from '@huolala-tech/page-spy-types';
import ErrorSvg from '@/assets/image/error.svg?react';
import InfoSvg from '@/assets/image/info.svg?react';
import WarnSvg from '@/assets/image/warn.svg?react';
import UserSvg from '@/assets/image/user.svg?react';
import DebugSvg from '@/assets/image/debug.svg?react';
import { debounce } from 'lodash-es';
import { useShallow } from 'zustand/react/shallow';
import { SectionLogActions } from '@/pages/Devtools/SectionLogActions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

export const HeaderActions = () => {
  const [changeConsoleMsgFilter, setConsoleMsgKeywordFilter] =
    useSocketMessageStore(
      useShallow((state) => [
        state.setConsoleMsgTypeFilter,
        state.setConsoleMsgKeywordFilter,
      ]),
    );

  const [selectedLevels, setSelectedLevels] = useState<SpyConsole.ProxyType[]>(
    [],
  );

  const toggleLevel = (level: SpyConsole.ProxyType) => {
    const next = selectedLevels.includes(level)
      ? selectedLevels.filter((l) => l !== level)
      : [...selectedLevels, level];
    setSelectedLevels(next);
    changeConsoleMsgFilter(next);
  };

  const logLevelList: Array<{
    label: string;
    value: SpyConsole.ProxyType;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { label: 'User messages', value: 'log', icon: UserSvg },
    { label: 'Errors', value: 'error', icon: ErrorSvg },
    { label: 'Warnings', value: 'warn', icon: WarnSvg },
    { label: 'Info', value: 'info', icon: InfoSvg },
    { label: 'Verbose', value: 'debug', icon: DebugSvg },
  ];

  const debouncedKeywordFilter = useMemo(
    () =>
      debounce((val: string) => {
        setConsoleMsgKeywordFilter(val);
      }, 300),
    [setConsoleMsgKeywordFilter],
  );

  return (
    <div className="console-header-actions flex flex-wrap items-center justify-end gap-2 p-1.5 w-full">
      <div className="flex items-center gap-1 overflow-x-auto">
        {logLevelList.map(({ label, value, icon: IconComponent }) => {
          const isActive = selectedLevels.includes(value);
          return (
            <Tooltip key={value}>
              <TooltipTrigger render={<span />}>
                <Button
                  type="button"
                  variant={isActive ? 'default' : 'outline'}
                  size="xs"
                  className={`h-7 px-2 text-xs flex items-center gap-1 ${
                    isActive ? 'border-primary' : 'opacity-70 hover:opacity-100'
                  }`}
                  onClick={() => toggleLevel(value)}
                >
                  <IconComponent className="size-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="w-36 sm:w-48">
        <Input
          onChange={(e) => debouncedKeywordFilter(e.target.value)}
          placeholder="Keyword Filter"
          className="h-7 text-xs"
        />
      </div>

      <SectionLogActions section="console" />
    </div>
  );
};
