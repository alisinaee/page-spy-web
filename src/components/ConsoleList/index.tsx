import { SpyConsole } from '@huolala-tech/page-spy-types';
import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  useMemo,
  useState,
} from 'react';
import { useMiscStore } from '@/store/misc';
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
    return raw.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '').trim();
  };

  // Talker wraps each line in a box. The top and bottom rules are only
  // decoration, so they never become a row.
  const isBoxSeparator = (value: string) => {
    const stripped = value.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '').trim();
    if (!stripped) return false;
    return (
      /^[┌┐└┘│├┤┬┴┼─\s_\-]+$/.test(stripped) && /[┌┐└┘│├┤┬┴┼─]/.test(stripped)
    );
  };

  const presentItem = (item: SpyConsole.DataItem): SpyConsole.DataItem => {
    if (!item.logs?.length) return item;
    let changed = false;
    const logs = item.logs.map((log) => {
      if (typeof log.value !== 'string') return log;
      const value = log.value
        .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
        .replace(/^[ \t]*│ ?/, '')
        .replace(/ ?│[ \t]*$/, '');
      if (value === log.value) return log;
      changed = true;
      return { ...log, value };
    });
    return changed ? { ...item, logs } : item;
  };

  const flushGroup = () => {
    if (!currentGroup || currentGroup.length === 0) {
      currentGroup = null;
      return;
    }
    if (currentGroup.length === 1) {
      result.push(presentItem(currentGroup[0]));
      currentGroup = null;
      return;
    }

    const contentOf = (it: SpyConsole.DataItem) =>
      extractCleanText(it)
        .replace(/^[┌┐└┘│├┤┬┴┼─\s]+/, '')
        .replace(/[┌┐└┘│├┤┬┴┼─\s]+$/, '')
        .trim();
    let titleLine = '';
    for (const it of currentGroup) {
      const clean = contentOf(it);
      if (!clean || /^[─\-]+$/.test(clean)) continue;
      if (!titleLine) titleLine = clean;
      // Talker puts the tag on the first content line: [http-response] | ...
      if (/^\[[^\]]+\]/.test(clean)) {
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
      id: `group-${first.id}`,
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
    if (isBoxSeparator(text)) {
      if (text.includes('┌')) {
        if (currentGroup) flushGroup();
        currentGroup = [];
      }
      if (text.includes('└')) flushGroup();
      continue;
    }

    const isBoxLine = /[┌│├└]/.test(text);
    const isBoxStart = text.includes('┌');

    if (isBoxLine) {
      if (isBoxStart && currentGroup) flushGroup();
      if (!currentGroup) currentGroup = [];
      currentGroup.push(presentItem(item));
      // One Talker box stays one group. A 150-line cut split the JSON body.
      if (text.includes('└')) flushGroup();
    } else {
      if (currentGroup) flushGroup();
      result.push(presentItem(item));
    }
  }

  if (currentGroup) flushGroup();
  return result;
}

/** Measures synchronously on mount so the list never starts at 0x0. */
const useBoxSize = (ref: React.RefObject<HTMLElement>) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const { clientWidth: width, clientHeight: height } = el;
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [ref]);
  return size;
};

interface Props {
  data: SpyConsole.DataItem[];
  onScroll: (props: ListOnScrollProps) => void;
  onActivate?: (item: SpyConsole.DataItem) => void;
  activeIndex?: number;
}

export const ConsoleList = forwardRef<VariableSizeList, Props>(
  ({ data, onScroll, onActivate, activeIndex }, ref) => {
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
      return heights.current.get(index) ?? 44;
    }, []);

    const [openIds, setOpenIds] = useState<ReadonlySet<string>>(
      () => new Set(),
    );
    const toggleOpen = useCallback((id: string) => {
      setOpenIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      // Reading a row means stop following the tail.
      useMiscStore.getState().setIsAutoScroll(false);
    }, []);

    const itemRenderer: ListProps<GroupedConsoleItem[]>['children'] =
      useCallback(
        ({ index, style, data }) => {
          const item = data[index];
          return (
            <div
              style={style}
              data-index={index}
              className={index === activeIndex ? 'bg-muted' : undefined}
              onClick={() => onActivate?.(item)}
            >
              <ConsoleItem
                data={item}
                expanded={openIds.has(item.id || String(index))}
                onToggle={() => toggleOpen(item.id || String(index))}
                onHeightChange={(height) => onHeightChange(index, height)}
              />
            </div>
          );
        },
        [activeIndex, openIds, toggleOpen, onActivate],
      );

    const wrapperRef = useRef<HTMLDivElement>(null);
    const size = useBoxSize(wrapperRef);

    return (
      <div ref={wrapperRef} className="h-full w-full overflow-hidden">
        {size.height > 0 && size.width > 0 && (
          <VariableSizeList
            ref={listRef}
            width={size.width}
            height={size.height}
            itemSize={getItemSize}
            itemData={groupedData}
            itemCount={groupedData.length}
            itemKey={(index, rowData) => rowData[index].id || String(index)}
            onScroll={onScroll}
          >
            {itemRenderer}
          </VariableSizeList>
        )}
      </div>
    );
  },
);
