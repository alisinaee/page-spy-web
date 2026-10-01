import { PropsWithChildren, useMemo, useRef, useState } from 'react';
import { AutoSizer, Table } from 'react-virtualized';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Filter } from 'lucide-react';
import clsx from 'clsx';
import ReactJsonView from '@huolala-tech/react-json-view';
import { useThrottle } from 'ahooks';
import React from 'react';

const NoData = () => (
  <div className="empty-table-placeholder text-center py-8 text-muted-foreground text-xs">
    No messages
  </div>
);

interface DataItem {
  id: string;
  data: string;
  timestamp: number;
}

type Props =
  | {
      type: 'websocket';
      data: (DataItem & { type: 'send' | 'receive' })[];
    }
  | {
      type: 'eventsource';
      data: DataItem[];
    };

export const MessageTable = ({
  type,
  data,
  children,
}: PropsWithChildren<Props>) => {
  const [filterType, setFilterType] = useState('all');
  const [filterKeyword, setFilterKeyword] = useState('');
  const _filterKey = useThrottle(filterKeyword, {
    wait: 500,
    leading: true,
    trailing: true,
  });
  const tableData = useMemo(() => {
    if (!data?.length) return [];

    let filteredData = data.filter(Boolean);
    if (type === 'websocket' && filterType !== 'all') {
      filteredData = data.filter((item) => item.type === filterType);
    }
    if (!_filterKey) {
      return filteredData;
    }

    try {
      // eslint-disable-next-line no-eval
      const filterRegex = eval(`/${_filterKey}/`);
      return filteredData.filter((item) => {
        return item.data.includes(_filterKey) || item.data.match(filterRegex);
      });
    } catch (e) {
      return filteredData;
    }
  }, [data, _filterKey, filterType, type]);

  const tableRef = useRef<Table | null>(null);
  const [activeRow, setActiveRow] = useState<DataItem | null>(null);

  return (
    <div className="message-table flex flex-col h-full">
      <div className="message-table-header flex items-center gap-2 p-2 border-b border-border">
        {type === 'websocket' && (
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs bg-secondary border border-border rounded px-2 py-1 w-24"
          >
            <option value="all">All</option>
            <option value="send">Send</option>
            <option value="receive">Receive</option>
          </select>
        )}
        <div className="relative flex-1 max-w-sm">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            placeholder="Filter using regexp (example: (web)?socket)"
            className="pl-8 h-7 text-xs"
          />
        </div>
      </div>
      <div className="message-table-body flex-1 overflow-hidden">
        <AutoSizer>
          {({ width, height }) => {
            return (
              <Table
                ref={tableRef}
                width={width}
                height={height}
                headerHeight={30}
                rowHeight={30}
                rowCount={tableData.length}
                rowGetter={({ index }) => {
                  return tableData[index];
                }}
                noRowsRenderer={NoData}
                rowClassName={({ index }) => {
                  if (index < 0) return '';
                  return clsx(index % 2 ? 'odd' : 'even', {
                    active: tableData[index].id === activeRow?.id,
                  });
                }}
                onRowClick={({ rowData }) => {
                  setActiveRow(rowData);
                }}
              >
                {children}
              </Table>
            );
          }}
        </AutoSizer>
      </div>

      <Sheet
        open={!!activeRow}
        onOpenChange={(open) => !open && setActiveRow(null)}
      >
        <SheetContent side="bottom" className="h-[40vh] overflow-y-auto">
          <SheetHeader className="pb-2 border-b border-border">
            <SheetTitle>Data</SheetTitle>
          </SheetHeader>
          <div className="p-3 font-mono text-xs">
            {activeRow?.data ? (
              <ReactJsonView source={activeRow.data} />
            ) : (
              <div className="text-muted-foreground text-center py-4">
                No data
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
