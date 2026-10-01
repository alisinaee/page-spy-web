import { useSocketMessageStore } from '@/store/socket-message';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Play } from 'lucide-react';
import ReactJsonView from '@huolala-tech/react-json-view';
import { useTranslation } from 'react-i18next';
import { useEventListener } from '@/utils/useEventListener';
import { CUSTOM_EVENT } from '@/store/socket-message/socket';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PanelEmpty } from '@/components/panel';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-end gap-2 border-b border-border px-2 py-2">
        <form
          onSubmit={onGetIndexedDB}
          className="flex min-w-0 flex-1 flex-wrap items-end gap-2"
        >
          <label className="flex min-w-36 flex-1 flex-col gap-1 text-xs text-muted-foreground">
            {t('database', { defaultValue: 'Database' })}
            <Select
              value={selectedDb}
              onValueChange={(dbName) => {
                if (!dbName) return;
                setSelectedDb(dbName);
                const dbObj = basicInfo?.find((i) => i.name === dbName);
                setSelectedStore(dbObj?.stores[0]?.name || '');
              }}
            >
              <SelectTrigger className="h-11 w-full text-foreground md:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {basicInfo?.map((i) => (
                  <SelectItem
                    key={i.name}
                    value={i.name}
                    className="min-h-11 md:min-h-0"
                  >
                    {i.name} (v{i.version || 1})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex min-w-36 flex-1 flex-col gap-1 text-xs text-muted-foreground">
            {t('store', { defaultValue: 'Store' })}
            <Select
              value={selectedStore}
              onValueChange={(v) => v && setSelectedStore(v)}
            >
              <SelectTrigger className="h-11 w-full text-foreground md:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentStores.map((s) => (
                  <SelectItem
                    key={s.name}
                    value={s.name}
                    className="min-h-11 md:min-h-0"
                  >
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <Button
            type="submit"
            size="lg"
            disabled={!selectedDb || !selectedStore}
            className="h-11 md:h-8"
          >
            <Play />
            {ct('submit')}
          </Button>
        </form>
        <div className="flex items-center gap-1">
          {isStale && (
            <div
              className="flex items-center gap-1 text-xs text-warning"
              title={t('entries-be-modified')!}
            >
              <AlertTriangle className="size-4" aria-hidden />
              <span>{t('data-be-stale')}</span>
            </div>
          )}
          <Button
            size="icon-touch"
            variant="ghost"
            className="md:size-8 md:min-h-0 md:min-w-0"
            disabled={!dbMsg?.page.prev}
            onClick={() => onSkip('prev')}
            aria-label={ct('prev-page', { defaultValue: 'Previous page' })!}
          >
            <ChevronLeft />
          </Button>
          <Button
            size="icon-touch"
            variant="ghost"
            className="md:size-8 md:min-h-0 md:min-w-0"
            disabled={!dbMsg?.page.next}
            onClick={() => onSkip('next')}
            aria-label={ct('next-page', { defaultValue: 'Next page' })!}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {tableData.length === 0 ? (
          <PanelEmpty title={t('no-data', { defaultValue: 'No data' })} />
        ) : (
          <Table className="table-fixed text-xs md:text-sm">
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="h-9 w-16 text-muted-foreground">
                  #
                </TableHead>
                <TableHead className="h-9 w-2/5 text-muted-foreground">
                  Key
                  {dbMsg?.store?.keyPath && (
                    <span className="ml-1 text-xs font-normal">
                      ({String(dbMsg.store.keyPath)})
                    </span>
                  )}
                </TableHead>
                <TableHead className="h-9 text-muted-foreground">
                  Value
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((item: DBItem) => (
                <TableRow key={item.index} className="hover:bg-muted/60">
                  <TableCell className="font-mono text-muted-foreground">
                    {item.index}
                  </TableCell>
                  <TableCell className="overflow-hidden font-mono">
                    <ReactJsonView source={item.keyPath} maxTitleSize={20} />
                  </TableCell>
                  <TableCell className="overflow-hidden font-mono">
                    <ReactJsonView source={item.value} maxTitleSize={50} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <div className="shrink-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">
        {t('total-entries')}: {dbMsg?.total || 0}
      </div>
    </div>
  );
};
