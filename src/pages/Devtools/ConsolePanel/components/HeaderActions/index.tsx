import { useSocketMessageStore } from '@/store/socket-message';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SpyConsole } from '@huolala-tech/page-spy-types';
import ErrorSvg from '@/assets/image/error.svg?react';
import InfoSvg from '@/assets/image/info.svg?react';
import WarnSvg from '@/assets/image/warn.svg?react';
import UserSvg from '@/assets/image/user.svg?react';
import DebugSvg from '@/assets/image/debug.svg?react';
import { debounce } from 'lodash-es';
import { useShallow } from 'zustand/react/shallow';
import { SectionLogActions } from '@/pages/Devtools/SectionLogActions';
import { FilterChip, PanelToolbar, SearchField } from '@/components/panel';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const HeaderActions = () => {
  const { t } = useTranslation();
  const [
    changeConsoleMsgFilter,
    setConsoleMsgKeywordFilter,
    consoleMsg,
    disabledTags,
    setConsoleDisabledTags,
  ] = useSocketMessageStore(
    useShallow((state) => [
      state.setConsoleMsgTypeFilter,
      state.setConsoleMsgKeywordFilter,
      state.consoleMsg,
      state.consoleDisabledTags,
      state.setConsoleDisabledTags,
    ]),
  );

  const [selectedLevels, setSelectedLevels] = useState<SpyConsole.ProxyType[]>(
    [],
  );
  const [keyword, setKeyword] = useState('');

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
    {
      label: t('console.filter.user', { defaultValue: 'User' }),
      value: 'log',
      icon: UserSvg,
    },
    {
      label: t('console.filter.errors', { defaultValue: 'Errors' }),
      value: 'error',
      icon: ErrorSvg,
    },
    {
      label: t('console.filter.warnings', { defaultValue: 'Warnings' }),
      value: 'warn',
      icon: WarnSvg,
    },
    {
      label: t('console.filter.info', { defaultValue: 'Info' }),
      value: 'info',
      icon: InfoSvg,
    },
    {
      label: t('console.filter.verbose', { defaultValue: 'Verbose' }),
      value: 'debug',
      icon: DebugSvg,
    },
  ];

  const tags = useMemo(() => {
    const found = new Set<string>();
    consoleMsg.forEach((item) => {
      const text = (item.logs || [])
        .map((log) =>
          typeof log.value === 'string'
            ? log.value
            : JSON.stringify(log.value ?? ''),
        )
        .join(' ');
      const matches = text.match(/\[([A-Z0-9_]+)\]/g);
      matches?.forEach((tag) => found.add(tag.slice(1, -1)));
    });
    return [...found].sort();
  }, [consoleMsg]);

  const toggleTag = (tag: string) => {
    const next = disabledTags.includes(tag)
      ? disabledTags.filter((item) => item !== tag)
      : [...disabledTags, tag];
    setConsoleDisabledTags(next);
  };

  const debouncedKeywordFilter = useMemo(
    () =>
      debounce((val: string) => {
        setConsoleMsgKeywordFilter(val);
      }, 300),
    [setConsoleMsgKeywordFilter],
  );
  useEffect(
    () => () => debouncedKeywordFilter.cancel(),
    [debouncedKeywordFilter],
  );

  const selectAll = () => {
    setSelectedLevels(logLevelList.map((item) => item.value));
    setConsoleDisabledTags([]);
  };
  const unselectAll = () => {
    setSelectedLevels([]);
    setConsoleDisabledTags(tags);
  };

  return (
    <PanelToolbar
      actions={<SectionLogActions section="console" />}
      menu={
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Filters"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-border text-foreground"
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 min-w-44">
            <DropdownMenuItem className="min-h-11" onClick={selectAll}>
              Select all
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" onClick={unselectAll}>
              Unselect all
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {logLevelList.map(({ label, value }) => (
              <DropdownMenuCheckboxItem
                key={value}
                className="min-h-11"
                checked={selectedLevels.includes(value)}
                onCheckedChange={() => toggleLevel(value)}
              >
                {label}
              </DropdownMenuCheckboxItem>
            ))}
            {tags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag}
                className="min-h-11"
                checked={!disabledTags.includes(tag)}
                onCheckedChange={() => toggleTag(tag)}
              >
                {tag}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      }
      search={
        <SearchField
          value={keyword}
          onChange={(val) => {
            setKeyword(val);
            debouncedKeywordFilter(val);
          }}
          label={t('console.keyword-filter', {
            defaultValue: 'Keyword filter',
          })}
        />
      }
    >
      {logLevelList.map(({ label, value, icon: IconComponent }) => (
        <FilterChip
          key={value}
          active={selectedLevels.includes(value)}
          onClick={() => toggleLevel(value)}
          icon={<IconComponent />}
        >
          {label}
        </FilterChip>
      ))}
      {tags.map((tag) => (
        <FilterChip
          key={tag}
          active={!disabledTags.includes(tag)}
          onClick={() => toggleTag(tag)}
        >
          {tag}
        </FilterChip>
      ))}
    </PanelToolbar>
  );
};
