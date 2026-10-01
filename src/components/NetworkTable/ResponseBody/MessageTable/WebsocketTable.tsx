/* eslint-disable react/no-unstable-nested-components */
import { Column, TableCellProps } from 'react-virtualized';
import { MessageTable } from '.';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import ArrowUpSvg from '@/assets/image/arrow-up.svg?react';
import ArrowDownSvg from '@/assets/image/arrow-down.svg?react';
import { isNil } from 'lodash-es';
import React from 'react';

interface WebsocketData {
  id: string;
  data: { type: 'send' | 'receive'; data: string; timestamp: number };
  timestamp: number;
}

export const WebsocketTable = ({ data }: { data: WebsocketData[] }) => {
  const tableData = useMemo(() => {
    return (data || [])
      .map((item) => {
        return {
          ...item,
          ...item.data,
        };
      })
      .filter((item) => !isNil(item.data));
  }, [data]);

  const DataColumn = ({ rowData }: TableCellProps) => {
    const isSend = rowData.type === 'send';
    const ArrowComp = isSend ? ArrowUpSvg : ArrowDownSvg;
    return (
      <div className="flex items-center gap-2 h-full">
        <ArrowComp
          style={{
            color: isSend ? '#156C2E' : '#B3261F',
            width: 16,
            height: 16,
          }}
        />
        <span className="truncate block font-mono text-xs" title={rowData.data}>
          {rowData.data}
        </span>
      </div>
    );
  };

  const LengthColumn = ({ rowData }: TableCellProps) => {
    return (
      <span className="truncate block font-mono text-xs">
        {rowData.data.length}
      </span>
    );
  };

  const TimeColumn = ({ rowData }: TableCellProps) => {
    return (
      <span className="truncate block font-mono text-xs text-muted-foreground">
        {dayjs(rowData.timestamp).format('HH:mm:ss:SSS')}
      </span>
    );
  };

  return (
    <MessageTable type="websocket" data={tableData}>
      <Column
        dataKey="data"
        label="Data"
        width={200}
        flexGrow={1}
        cellRenderer={DataColumn}
      />
      <Column
        dataKey="length"
        label="Length"
        width={100}
        cellRenderer={LengthColumn}
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
