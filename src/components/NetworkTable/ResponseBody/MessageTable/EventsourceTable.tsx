import { Column, TableCellRenderer } from 'react-virtualized';
import { MessageTable } from '.';
import dayjs from 'dayjs';
import { useCallback, useMemo } from 'react';
import { isNil } from 'lodash-es';
import React from 'react';

interface EventsourceData {
  id: string;
  data: string;
  timestamp: number;
}

export const EventsourceTable = ({ data }: { data: EventsourceData[] }) => {
  const tableData = useMemo(() => {
    return data.filter((item) => !isNil(item.data));
  }, [data]);

  const IdColumn = useCallback<TableCellRenderer>(({ rowData }) => {
    return (
      <span className="truncate block font-mono text-xs" title={rowData.id}>
        {rowData.id}
      </span>
    );
  }, []);

  const DataColumn = useCallback<TableCellRenderer>(({ rowData }) => {
    return (
      <span className="truncate block font-mono text-xs" title={rowData.data}>
        {rowData.data}
      </span>
    );
  }, []);

  const TimeColumn = useCallback<TableCellRenderer>(({ rowData }) => {
    return (
      <span className="truncate block font-mono text-xs text-muted-foreground">
        {rowData.timestamp
          ? dayjs(rowData.timestamp).format('HH:mm:ss:SSS')
          : ''}
      </span>
    );
  }, []);

  return (
    <MessageTable type="eventsource" data={tableData}>
      <Column dataKey="id" label="Id" width={150} cellRenderer={IdColumn} />
      <Column
        dataKey="data"
        label="Data"
        width={400}
        flexGrow={1}
        cellRenderer={DataColumn}
      />
      <Column
        dataKey="timestamp"
        label="Time"
        width={120}
        cellRenderer={TimeColumn}
      />
    </MessageTable>
  );
};
