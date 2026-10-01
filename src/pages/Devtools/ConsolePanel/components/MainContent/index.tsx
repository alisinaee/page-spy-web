import { useSocketMessageStore } from '@/store/socket-message';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMiscStore } from '@/store/misc';
import { useForceThrottleRender } from '@/utils/useForceRender';
import { ConsoleList, groupConsoleItems } from '@/components/ConsoleList';
import { VariableSizeList, ListOnScrollProps } from 'react-window';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import { Terminal } from 'lucide-react';
import { PanelEmpty } from '@/components/panel';

const MAX_VISIBLE = 2000;

export const MainContent = memo(() => {
  const { t } = useTranslation();
  const storeRef = useRef(useSocketMessageStore.getState());
  const consoleMessages = useRef(storeRef.current.consoleMsg);
  const consoleFilter = useRef(storeRef.current.consoleMsgTypeFilter);
  const consoleKeywordFilter = useRef(storeRef.current.consoleMsgKeywordFilter);
  const consoleDisabledTags = useRef(storeRef.current.consoleDisabledTags);
  const { isUpdated, throttleRender } = useForceThrottleRender();
  useEffect(
    () =>
      useSocketMessageStore.subscribe((state) => {
        consoleMessages.current = state.consoleMsg;
        consoleFilter.current = state.consoleMsgTypeFilter;
        consoleKeywordFilter.current = state.consoleMsgKeywordFilter;
        consoleDisabledTags.current = state.consoleDisabledTags;
        throttleRender();
      }),
    [throttleRender],
  );

  const [isAutoScroll, setIsAutoScroll] = useMiscStore(
    useShallow((state) => [state.isAutoScroll, state.setIsAutoScroll]),
  );

  const handleScroll = useCallback(
    ({
      scrollDirection,
      scrollOffset,
      scrollUpdateWasRequested,
    }: ListOnScrollProps) => {
      // Programmatic jumps, and the clamp after scrollToItem, are not the
      // user reading. Only a real move away from the tail pauses follow.
      if (
        scrollUpdateWasRequested ||
        !isAutoScroll ||
        scrollDirection !== 'backward'
      ) {
        return;
      }
      const outer = (
        consoleListRef.current as { _outerRef?: HTMLElement } | null
      )?._outerRef;
      const distance = outer
        ? outer.scrollHeight - outer.clientHeight - scrollOffset
        : 0;
      if (distance <= 24) return;
      setIsAutoScroll(false);
    },
    [isAutoScroll, setIsAutoScroll],
  );

  const filteredList = useMemo(() => {
    const data = consoleMessages.current;
    const logLevels = consoleFilter.current;
    const keyword = consoleKeywordFilter.current.trim();
    const disabledTags = consoleDisabledTags.current;
    const textOf = (item: (typeof data)[number]) =>
      (item.logs || [])
        .map((log) =>
          typeof log.value === 'string'
            ? log.value
            : JSON.stringify(log.value ?? ''),
        )
        .join(' ');
    return data.filter((item) => {
      if (logLevels.length && !logLevels.includes(item.logType)) return false;
      const text = textOf(item);
      if (keyword && text.indexOf(keyword) === -1) return false;
      if (disabledTags.length) {
        const tags = text.match(/\[([A-Z0-9_]+)\]/g) || [];
        if (
          tags.length &&
          tags.every((tag) => disabledTags.includes(tag.slice(1, -1)))
        ) {
          return false;
        }
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUpdated]);

  // Low-end phones: only render the newest entries.
  const isCapped = filteredList.length > MAX_VISIBLE;
  const consoleDataList = useMemo(
    () => (isCapped ? filteredList.slice(-MAX_VISIBLE) : filteredList),
    [filteredList, isCapped],
  );

  const consoleListRef = useRef<VariableSizeList>(null);
  const cursorRef = useRef(0);
  const [cursor, setCursor] = useState(-1);
  const appliedKeyword = useRef('');
  const reportedMatch = useRef({ index: -1, count: -1 });

  const publishMatch = (index: number, count: number) => {
    if (
      reportedMatch.current.index === index &&
      reportedMatch.current.count === count
    ) {
      return;
    }
    reportedMatch.current = { index, count };
    window.dispatchEvent(
      new CustomEvent('devtools:console-search-state', {
        detail: { index, count },
      }),
    );
  };

  useEffect(() => {
    if (
      !isAutoScroll ||
      consoleKeywordFilter.current.trim() ||
      consoleDataList.length === 0
    ) {
      return;
    }
    consoleListRef.current?.scrollToItem(consoleDataList.length - 1, 'end');
  }, [consoleDataList, isAutoScroll]);

  useEffect(() => {
    const keyword = consoleKeywordFilter.current.trim();
    const count = keyword ? groupConsoleItems(consoleDataList).length : 0;
    if (!keyword) {
      appliedKeyword.current = '';
      cursorRef.current = 0;
      setCursor(-1);
      publishMatch(0, 0);
      return;
    }
    if (appliedKeyword.current !== keyword) {
      appliedKeyword.current = keyword;
      cursorRef.current = 0;
      setCursor(count ? 0 : -1);
      useMiscStore.getState().setIsAutoScroll(false);
      if (count) {
        requestAnimationFrame(() =>
          consoleListRef.current?.scrollToItem(0, 'smart'),
        );
      }
      publishMatch(count ? 1 : 0, count);
      return;
    }
    if (cursorRef.current >= count) {
      cursorRef.current = Math.max(0, count - 1);
      setCursor(count ? cursorRef.current : -1);
    }
    publishMatch(count ? cursorRef.current + 1 : 0, count);
  }, [consoleDataList]);

  useEffect(() => {
    const onStep = (event: Event) => {
      const delta = (event as CustomEvent<number>).detail;
      const count = groupConsoleItems(consoleDataList).length;
      if (!count) return;
      const current = cursorRef.current;
      const next =
        current < 0 || current >= count
          ? delta < 0
            ? count - 1
            : 0
          : (current + delta + count) % count;
      cursorRef.current = next;
      setCursor(next);
      useMiscStore.getState().setIsAutoScroll(false);
      requestAnimationFrame(() =>
        consoleListRef.current?.scrollToItem(next, 'smart'),
      );
      publishMatch(next + 1, count);
    };
    window.addEventListener('devtools:console-search-step', onStep);
    return () =>
      window.removeEventListener('devtools:console-search-step', onStep);
  }, [consoleDataList]);

  useEffect(() => {
    const handleScrollToEnd = () => {
      if (consoleDataList.length > 0) {
        consoleListRef.current?.scrollToItem(consoleDataList.length - 1, 'end');
      }
    };
    window.addEventListener('devtools:scroll-console-end', handleScrollToEnd);
    return () => {
      window.removeEventListener(
        'devtools:scroll-console-end',
        handleScrollToEnd,
      );
    };
  }, [consoleDataList]);

  return (
    <div className="main-content flex min-h-0 min-w-0 flex-1 flex-col">
      {isCapped && (
        <div className="shrink-0 border-b border-border px-3 py-1 text-center text-xs text-muted-foreground">
          {t('console.showing-latest', {
            count: MAX_VISIBLE,
            defaultValue: 'Showing latest {{count}}',
          })}
        </div>
      )}
      <div className="min-h-0 flex-1">
        {consoleDataList.length === 0 ? (
          <PanelEmpty
            icon={<Terminal />}
            title={t('console.empty', { defaultValue: 'No logs yet' })}
          />
        ) : (
          <ConsoleList
            data={consoleDataList}
            ref={consoleListRef}
            onScroll={handleScroll}
            activeIndex={
              consoleKeywordFilter.current.trim() ? cursor : undefined
            }
          />
        )}
      </div>
    </div>
  );
});
