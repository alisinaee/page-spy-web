import { useCacheDetailStore } from '@/store/cache-detail';
import { StorageType } from '@/store/platform-config';
import { SpyStorage } from '@huolala-tech/page-spy-types';
import { capitalize } from 'lodash-es';
import { useMemo, useRef, useState } from 'react';
import { ResizableTitle } from '../ResizableTitle';
import { ResizeCallbackData } from 'react-resizable';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

interface ColumnDef {
  key: string;
  dataIndex: keyof SpyStorage.Data;
  title: string;
  width: number;
  sorter?: (a: SpyStorage.Data, b: SpyStorage.Data) => number;
  render?: (val: any, record: SpyStorage.Data) => React.ReactNode;
}

const defaultCols: ColumnDef[] = [
  {
    key: 'name',
    dataIndex: 'name',
    title: 'Name',
    width: 200,
    sorter: (a, b) => a.name.localeCompare(b.name),
  },
  {
    key: 'value',
    dataIndex: 'value',
    title: 'Value',
    width: 300,
    sorter: (a, b) => a.value.localeCompare(b.value),
  },
  {
    key: 'domain',
    dataIndex: 'domain',
    title: 'Domain',
    width: 200,
    sorter: (a, b) => {
      if (!(a.domain && b.domain)) return 0;
      return a.domain.localeCompare(b.domain);
    },
  },
  {
    key: 'path',
    dataIndex: 'path',
    title: 'Path',
    width: 100,
    sorter: (a, b) => {
      if (!(a.path && b.path)) return 0;
      return a.path.localeCompare(b.path);
    },
  },
  {
    key: 'expires',
    dataIndex: 'expires',
    title: 'Expires',
    width: 240,
    render: (value: string) => {
      const time = value ? new Date(value).toISOString() : 'Session';
      return (
        <Tooltip>
          <TooltipTrigger
            render={<span className="truncate block">{time}</span>}
          />
          <TooltipContent>{time}</TooltipContent>
        </Tooltip>
      );
    },
    sorter: (a, b) => {
      if (!(a.expires && b.expires)) return 0;
      return String(a.expires).localeCompare(String(b.expires));
    },
  },
  {
    key: 'secure',
    dataIndex: 'secure',
    title: 'Secure',
    width: 80,
    render: (bool: boolean) => bool && '✅',
    sorter: (a, b) => {
      if (!(a.secure && b.secure)) return 0;
      return String(a.secure).localeCompare(String(b.secure));
    },
  },
  {
    key: 'sameSite',
    dataIndex: 'sameSite',
    title: 'SameSite',
    width: 80,
    render: (v: string) => (v ? capitalize(v) : ''),
    sorter: (a, b) => {
      if (!(a.sameSite && b.sameSite)) return 0;
      return String(a.sameSite).localeCompare(String(b.sameSite));
    },
  },
  {
    key: 'partitioned',
    dataIndex: 'partitioned',
    title: 'Partitioned',
    width: 80,
    sorter: (a, b) => {
      if (!(a.partitioned && b.partitioned)) return 0;
      return String(a.partitioned).localeCompare(String(b.partitioned));
    },
  },
];

interface Props {
  activeTab: StorageType;
  storageMsg: Record<StorageType, SpyStorage.GetTypeDataItem['data']>;
  resizeCacheKey: string;
}

export const StorageTable = ({
  activeTab,
  storageMsg,
  resizeCacheKey,
}: Props) => {
  const data = useMemo(() => {
    return Object.values(storageMsg[activeTab] || {});
  }, [activeTab, storageMsg]);

  const hasDetail = useMemo(() => {
    const { name, value, ...rest } = data[0] || {};
    return Object.keys(rest).length > 0;
  }, [data]);

  const unionCacheKey = useMemo(
    () => `${resizeCacheKey}:${activeTab}`,
    [resizeCacheKey, activeTab],
  );
  const cacheWidthRef = useRef<Record<string, { [title: string]: number }>>({});

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const cache = localStorage.getItem(unionCacheKey);
    const val = cache ? JSON.parse(cache) : {};
    return val || {};
  });

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const visibleCols = useMemo(() => {
    let cols = defaultCols;
    if (!hasDetail) {
      cols = cols.slice(0, 2);
    }
    return cols;
  }, [hasDetail]);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = visibleCols.find((c) => c.key === sortKey);
    if (!col || !col.sorter) return data;
    const sorted = [...data].sort(col.sorter);
    return sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [data, sortKey, sortOrder, visibleCols]);

  const setDetailInfo = useCacheDetailStore((state) => state.setCurrentDetail);

  const handleResize =
    (title: string) =>
    (_: any, { size }: ResizeCallbackData) => {
      setColWidths((prev) => {
        const next = { ...prev, [title]: size.width };
        cacheWidthRef.current[unionCacheKey] = next;
        return next;
      });
    };

  const handleResizeStop = () => {
    const refValue = cacheWidthRef.current[unionCacheKey];
    if (refValue) {
      localStorage.setItem(unionCacheKey, JSON.stringify(refValue));
    }
  };

  return (
    <div className="storage-table w-full overflow-auto">
      <Table className="text-xs">
        <TableHeader>
          <TableRow>
            {visibleCols.map((col) => {
              const width = colWidths[col.title] || col.width;
              return (
                <ResizableTitle
                  key={col.key}
                  width={width}
                  onResize={handleResize(col.title) as any}
                  onResizeStop={handleResizeStop as any}
                  onClick={() => {
                    if (col.sorter) {
                      if (sortKey === col.key) {
                        setSortOrder((prev) =>
                          prev === 'asc' ? 'desc' : 'asc',
                        );
                      } else {
                        setSortKey(col.key);
                        setSortOrder('asc');
                      }
                    }
                  }}
                  className="cursor-pointer select-none font-semibold text-muted-foreground"
                  style={{ width }}
                >
                  <div className="flex items-center justify-between">
                    <span>{col.title}</span>
                    {sortKey === col.key && (
                      <span className="ml-1 text-[10px]">
                        {sortOrder === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </ResizableTitle>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={visibleCols.length}
                className="text-center py-8 text-muted-foreground"
              >
                No data
              </TableCell>
            </TableRow>
          ) : (
            sortedData.map((row, idx) => (
              <TableRow
                key={row.name || idx}
                onClick={() => setDetailInfo(row.value || '')}
                className="cursor-pointer hover:bg-muted/50"
              >
                {visibleCols.map((col) => {
                  const val = row[col.dataIndex];
                  return (
                    <TableCell
                      key={col.key}
                      className="max-w-xs truncate"
                      style={{ width: colWidths[col.title] || col.width }}
                    >
                      {col.render ? col.render(val, row) : String(val ?? '')}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
