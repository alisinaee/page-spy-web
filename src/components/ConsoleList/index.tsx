import { SpyConsole } from '@huolala-tech/page-spy-types';
import { forwardRef, useCallback, useRef, useMemo } from 'react';
import { AutoSizer } from 'react-virtualized';
import { VariableSizeList, ListProps, ListOnScrollProps } from 'react-window';
import { ConsoleItem } from './components/ConsoleItem';

export type GroupedConsoleItem = SpyConsole.DataItem & {
  isGroup?: boolean;
  groupItems?: SpyConsole.DataItem[];
  groupTitle?: string;
};

export function groupConsoleItems(
  items: SpyConsole.DataItem[],
): GroupedConsoleItem[] {
  if (!items?.length) return [];
  const result: GroupedConsoleItem[] = [];
  let currentGroup: SpyConsole.DataItem[] | null = null;

  const partText = (value: unknown) => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean')
      return String(value);
    return '';
  };

  const extractCleanText = (item: SpyConsole.DataItem): string => {
    const fromLogs = item.logs?.map((l) => partText(l.value)).join(' ') || '';
    const message = (item as { message?: unknown }).message;
    const raw = fromLogs.trim()
      ? fromLogs
      : typeof message === 'string'
      ? message
      : '';
    return raw.replace(/\u001b\[[0-9;]*m/g, '').trim();
  };

  const flushGroup = () => {
    if (!currentGroup || currentGroup.length === 0) {
      currentGroup = null;
      return;
    }
    if (currentGroup.length === 1) {
      result.push(currentGroup[0]);
      currentGroup = null;
      return;
    }

    let titleLine = '';
    for (const it of currentGroup) {
      const clean = extractCleanText(it)
        .replace(/^[┌│├└─\s]+/, '')
        .trim();
      if (clean && !clean.match(/^─+$/)) {
        titleLine = clean;
        break;
      }
    }
    if (!titleLine) {
      titleLine = extractCleanText(currentGroup[0]) || 'Log group';
    }

    let worstType: SpyConsole.DataItem['logType'] = 'log';
    for (const it of currentGroup) {
      if (it.logType === 'error') {
        worstType = 'error';
        break;
      }
      if (it.logType === 'warn') {
        worstType = 'warn';
      }
    }

    const first = currentGroup[0];
    const groupedItem: GroupedConsoleItem = {
      ...first,
      id: `group-${first.id}-${currentGroup.length}`,
      logType: worstType,
      isGroup: true,
      groupItems: currentGroup,
      groupTitle: titleLine,
    };
    result.push(groupedItem);
    currentGroup = null;
  };

  for (const item of items) {
    const text = extractCleanText(item);
    const hasValue = Boolean(
      item.logs?.some(
        (l) => l.value !== null && l.value !== undefined && l.value !== '',
      ),
    );
    const legacyMessage =
      typeof (item as { message?: unknown }).message === 'string' &&
      String((item as { message?: unknown }).message).trim() !== '';
    if (!text && !hasValue && !legacyMessage) continue;
    const isBoxLine = /[┌│├└]/.test(text);
    const isBoxStart = text.includes('┌');

    if (isBoxLine) {
      if (isBoxStart && currentGroup) flushGroup();
      if (!currentGroup) currentGroup = [];
      currentGroup.push(item);
      if (text.includes('└') || currentGroup.length >= 150) flushGroup();
    } else {
      if (currentGroup) flushGroup();
      result.push(item);
    }
  }

  if (currentGroup) flushGroup();
  return result;
}

interface Props {
  data: SpyConsole.DataItem[];
  onScroll: (props: ListOnScrollProps) => void;
}

export const ConsoleList = forwardRef<VariableSizeList, Props>(
  ({ data, onScroll }, ref) => {
    const innerRef = useRef<VariableSizeList>(null);
    const listRef = ref ?? innerRef;
    const heights = useRef<Map<number, number>>(new Map());

    const groupedData = useMemo(() => groupConsoleItems(data), [data]);
    const groupedCount = useRef(0);
    if (groupedData.length < groupedCount.current) {
      heights.current.clear();
      Object(listRef).current?.resetAfterIndex(0, true);
    }
    groupedCount.current = groupedData.length;

    const onHeightChange = (index: number, height: number) => {
      heights.current.set(index, height);
      Object(listRef).current?.resetAfterIndex(index, true);
    };

    const getItemSize = useCallback((index: number) => {
      return heights.current.get(index) ?? 27;
    }, []);

    const itemRenderer: ListProps<GroupedConsoleItem[]>['children'] =
      useCallback(({ index, style, data }) => {
        const item = data[index];
        return (
          <div style={style} data-index={index} key={item.id}>
            <ConsoleItem
              data={item}
              onHeightChange={(height) => onHeightChange(index, height)}
            />
          </div>
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

    return (
      <AutoSizer>
        {({ width, height }) => (
          <VariableSizeList
            ref={listRef}
            width={width}
            height={height}
            itemSize={getItemSize}
            itemData={groupedData}
            itemCount={groupedData.length}
            onScroll={onScroll}
          >
            {itemRenderer}
          </VariableSizeList>
        )}
      </AutoSizer>
    );
  },
);
