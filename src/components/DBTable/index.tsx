import { useSocketMessageStore } from '@/store/socket-message';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import ReactJsonView from '@huolala-tech/react-json-view';
import { useTranslation } from 'react-i18next';
import { useEventListener } from '@/utils/useEventListener';
import { CUSTOM_EVENT } from '@/store/socket-message/socket';
import { ResizeCallbackData } from 'react-resizable';
import { ResizableTitle } from '../ResizableTitle';
import { ONLINE_DB_CACHE } from '../ResizableTitle/cache-key';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';

interface DBItem {
  index: number;
  keyPath: string;
  value: string;
}

export const DBTable = () => {
  const { t: ct } = useTranslation('translation', { keyPrefix: 'common' });
  const { t } = useTranslation('translation', { keyPrefix: 'storage' });
  const [socket, { basicInfo, data: dbMsg }] = useSocketMessageStore(
    useShallow((state) => [state.socket, state.databaseMsg]),
  );
  const [selectedDb, setSelectedDb] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [isStale, setIsStale] = useState(false);

  // Set default selection when basicInfo arrives
  useEffect(() => {
    if (basicInfo && basicInfo.length > 0 && !selectedDb) {
      setSelectedDb(basicInfo[0].name);
      if (basicInfo[0].stores && basicInfo[0].stores.length > 0) {
        setSelectedStore(basicInfo[0].stores[0].name);
      }
    }
  }, [basicInfo, selectedDb]);

  const currentStores = useMemo(() => {
    return basicInfo?.find((i) => i.name === selectedDb)?.stores || [];
  }, [basicInfo, selectedDb]);

  const onGetIndexedDB = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!selectedDb || !selectedStore) return;
      if (isStale) {
        setIsStale(false);
      }
      if (!socket) return;
      socket.unicastMessage({
        type: 'database-pagination',
        data: {
          db: selectedDb,
          store: selectedStore,
          page: 1,
        },
      });
    },
    [isStale, selectedDb, selectedStore, socket],
  );

  const onSkip = useCallback(
    (action: 'prev' | 'next') => {
      if (isStale) {
        setIsStale(false);
      }
      if (!socket || !dbMsg) return;
      socket.unicastMessage({
        type: 'database-pagination',
        data: {
          db: dbMsg.database?.name,
          store: dbMsg.store?.name,
          page: dbMsg.page[action],
        },
      });
    },
    [dbMsg, isStale, socket],
  );

  useEventListener(CUSTOM_EVENT.DatabaseStoreUpdated, (evt: Event) => {
    const { database, store } = (evt as CustomEvent).detail;
    if (selectedDb === database && selectedStore === store) {
      setIsStale(true);
    }
  });

  const [colWidths, setColWidths] = useState<{
    index: number;
    keyPath: number;
  }>(() => {
    const cache = localStorage.getItem(ONLINE_DB_CACHE);
    const value = cache && JSON.parse(cache);
    return {
      index: value?.index || 80,
      keyPath: value?.keyPath || 300,
    };
  });

  const handleResize =
    (key: 'index' | 'keyPath') =>
    (_: any, { size }: ResizeCallbackData) => {
      setColWidths((prev) => {
        const next = { ...prev, [key]: size.width };
        localStorage.setItem(ONLINE_DB_CACHE, JSON.stringify(next));
        return next;
      });
    };

  const tableData = useMemo(() => {
    if (!dbMsg) return [];
    const { page, data } = dbMsg;
    const result = data.map((val: any, idx: number) => {
      const index = 50 * (page.current - 1) + idx;
      const item: DBItem = {
        index,
        keyPath: val.key,
        value: val.value,
      };
      return item;
    });
    return result;
  }, [dbMsg]);

  return (
    <div className="database-info flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sticky top-0 z-10 bg-background border-b border-border">
        <form
          onSubmit={onGetIndexedDB}
          className="flex flex-wrap items-center gap-2"
        >
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">Database:</span>
            <select
              value={selectedDb}
              onChange={(e) => {
                const dbName = e.target.value;
                setSelectedDb(dbName);
                const dbObj = basicInfo?.find((i) => i.name === dbName);
                setSelectedStore(dbObj?.stores[0]?.name || '');
              }}
              className="bg-secondary border border-border rounded px-2.5 py-1 text-xs min-w-[140px]"
            >
              {basicInfo?.map((i) => (
                <option key={i.name} value={i.name}>
                  {i.name} (v{i.version || 1})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">Store:</span>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-secondary border border-border rounded px-2.5 py-1 text-xs min-w-[140px]"
            >
              {currentStores.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={!selectedDb || !selectedStore}
            className="h-7 text-xs px-3"
          >
            {ct('submit')}
          </Button>
        </form>

        <div className="flex items-center gap-2">
          {isStale && (
            <div className="flex items-center gap-1 text-xs text-warning">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="cursor-pointer">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                  }
                />
                <TooltipContent>{t('entries-be-modified')}</TooltipContent>
              </Tooltip>
              <span>{t('data-be-stale')}</span>
            </div>
          )}
          <Button
            size="icon-touch"
            variant="outline"
            className="h-7 w-7"
            disabled={!dbMsg?.page.prev}
            onClick={() => onSkip('prev')}
            aria-label="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon-touch"
            variant="outline"
            className="h-7 w-7"
            disabled={!dbMsg?.page.next}
            onClick={() => onSkip('next')}
            aria-label="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="database-table flex-1 overflow-auto">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <ResizableTitle
                width={colWidths.index}
                onResize={handleResize('index') as any}
                className="font-semibold text-muted-foreground"
                style={{ width: colWidths.index }}
              >
                #
              </ResizableTitle>
              <ResizableTitle
                width={colWidths.keyPath}
                onResize={handleResize('keyPath') as any}
                className="font-semibold text-muted-foreground"
                style={{ width: colWidths.keyPath }}
              >
                <div className="flex items-center gap-1">
                  <span>Key</span>
                  {dbMsg?.store?.keyPath && (
                    <span className="text-[10px] text-muted-foreground">
                      (Key path: {String(dbMsg.store.keyPath)})
                    </span>
                  )}
                </div>
              </ResizableTitle>
              <ResizableTitle className="font-semibold text-muted-foreground">
                Value
              </ResizableTitle>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center py-8 text-muted-foreground"
                >
                  No data
                </TableCell>
              </TableRow>
            ) : (
              tableData.map((item: DBItem) => (
                <TableRow key={item.index} className="hover:bg-muted/50">
                  <TableCell style={{ width: colWidths.index }}>
                    {item.index}
                  </TableCell>
                  <TableCell
                    style={{ width: colWidths.keyPath }}
                    className="font-mono text-xs overflow-hidden"
                  >
                    <ReactJsonView source={item.keyPath} maxTitleSize={20} />
                  </TableCell>
                  <TableCell className="font-mono text-xs overflow-hidden">
                    <ReactJsonView source={item.value} maxTitleSize={50} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="database-total-entries z-10 border-t border-border p-2 text-xs text-muted-foreground">
        {t('total-entries')}: {dbMsg?.total || 0}
      </div>
    </div>
  );
};
