/* eslint-disable no-case-declarations */
import { SpyStorage } from '@huolala-tech/page-spy-types';
import clsx from 'clsx';
import copy from 'copy-to-clipboard';
import { throttle } from 'lodash-es';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { getStatusInfo, getTime } from './utils';
import { buildCurlCommand, responseLogText } from './body-codec';
import { useTranslation } from 'react-i18next';
import './index.css';
import { NetworkDetail } from './NetworkDetail';
import { ResolvedNetworkInfo } from '@/utils';
import { ChevronDown, Info, ChevronUp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  Column,
  AutoSizer,
  TableCellRenderer,
  SortDirectionType,
  TableHeaderRenderer,
} from 'react-virtualized';
import 'react-virtualized/styles.css';
import Draggable from 'react-draggable';
import { NetworkType, RESOURCE_TYPE } from './TypeFilter';
import { useEventListener } from '@/utils/useEventListener';
import React from 'react';

const columnField = [
  'name',
  'pathname',
  'method',
  'status',
  'requestType',
  'costTime',
] as const;
type ColumnField = (typeof columnField)[number];

const NoData = () => (
  <div className="empty-table-placeholder absolute left-1/2 top-20 -translate-x-1/2 text-center py-12 text-muted-foreground text-xs">
    No data
  </div>
);

const buildCurl = (
  row: ResolvedNetworkInfo,
  cookie?: SpyStorage.GetTypeDataItem['data'],
) => buildCurlCommand(row, cookie);

const formatResponseLog = (row: ResolvedNetworkInfo) => {
  const headerText = row.responseHeader
    ? row.responseHeader.map(([key, value]) => `${key}: ${value}`).join('\n')
    : '';
  return [
    '# Response',
    `status: ${row.status ?? ''}`,
    headerText,
    responseLogText(row.response, row.responseReason),
  ]
    .filter(Boolean)
    .join('\n');
};

interface NetworkTableProps {
  data: ResolvedNetworkInfo[];
  filterType: NetworkType;
  filterKeyword: string;
  cookie?: SpyStorage.GetTypeDataItem['data'];
  resizeCacheKey: string;
}

export const NetworkTable = ({
  data: originData,
  cookie,
  filterType = 'All',
  filterKeyword = '',
}: NetworkTableProps) => {
  const { t: nt } = useTranslation('translation', { keyPrefix: 'network' });

  const containerWidth = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [activeRow, setActiveRow] = useState<ResolvedNetworkInfo | null>(null);
  const [sortBy, setSortBy] = useState<keyof ResolvedNetworkInfo | undefined>(
    undefined,
  );
  const [sortDirection, setSortDirection] = useState<
    SortDirectionType | undefined
  >(undefined);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    row: ResolvedNetworkInfo;
  } | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // See: https://github.com/HuolalaTech/page-spy-web/issues/382
  const removeDuplicatedData = useMemo(() => {
    const isSuspiciousResource = (item: ResolvedNetworkInfo) =>
      !item.requestType && item.responseType === 'resource';

    const normalUrls = new Set<string>(
      originData
        .filter((item) => !isSuspiciousResource(item))
        .map((item) => item.url),
    );

    return originData.filter((item) => {
      return !isSuspiciousResource(item) || !normalUrls.has(item.url);
    });
  }, [originData]);

  const data = useMemo(() => {
    const keyword = filterKeyword.trim().toLocaleLowerCase();
    if (!keyword && filterType === 'All' && !sortBy && !sortDirection) {
      return removeDuplicatedData;
    }
    const filteredData = removeDuplicatedData.filter(
      (msg) =>
        RESOURCE_TYPE.get(filterType)?.(msg.requestType) &&
        msg.url.toLocaleLowerCase().includes(keyword),
    );
    if (sortBy && sortDirection) {
      return filteredData.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return sortDirection === 'ASC' ? -1 : 1;
        if (a[sortBy] > b[sortBy]) return sortDirection === 'ASC' ? 1 : -1;
        return 0;
      });
    }
    return filteredData;
  }, [filterKeyword, filterType, removeDuplicatedData, sortBy, sortDirection]);

  // Update the active row real-time
  useEffect(() => {
    if (!showDetail || !activeRow) return;
    const index = data.findIndex((item) => item.id === activeRow.id);
    if (index === -1) return;
    setActiveRow(data[index]);
  }, [data, activeRow, showDetail]);

  const [leftDistance, setLeftDistance] = useState('20%');
  useEventListener('keydown', (evt) => {
    const { key } = evt as KeyboardEvent;
    switch (key.toLocaleLowerCase()) {
      case 'escape':
        setShowDetail(false);
        break;
      case 'arrowup':
        if (activeRow) {
          const index = data.findIndex((item) => item.id === activeRow.id);
          if (index > 0) setActiveRow(data[index - 1]);
        }
        break;
      case 'arrowdown':
        if (activeRow) {
          const index = data.findIndex((item) => item.id === activeRow.id);
          if (index < data.length - 1) setActiveRow(data[index + 1]);
        }
        break;
      default:
        break;
    }
  });

  const onMenuClick = useCallback(
    (key: string, row: ResolvedNetworkInfo) => {
      switch (key) {
        case 'copy-link':
          copy(row.url);
          break;
        case 'open-in-new-tab':
          window.open(row.url);
          break;
        case 'copy-cURL':
          copy(buildCurl(row, cookie));
          break;
        case 'copy-full-log':
          copy([buildCurl(row, cookie), '', formatResponseLog(row)].join('\n'));
          break;
        default:
          throw Error('Unknown key');
      }
      setContextMenu(null);
    },
    [cookie],
  );

  const tableRef = useRef<Table | null>(null);
  useEffect(() => {
    const observer = new ResizeObserver(
      throttle(() => {
        // @ts-ignore
        tableRef.current?.recomputeGridSize();
      }, 150),
    );
    observer.observe(containerRef.current!);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleScrollToEnd = () => {
      if (data.length > 0) {
        tableRef.current?.scrollToRow(data.length - 1);
      }
    };
    window.addEventListener('devtools:scroll-network-end', handleScrollToEnd);
    return () => {
      window.removeEventListener(
        'devtools:scroll-network-end',
        handleScrollToEnd,
      );
    };
  }, [data]);

  const [columnsWidth, setColumnsWidth] = useState<Record<ColumnField, number>>(
    {
      name: 0.3,
      pathname: 0.3,
      method: 0.1,
      status: 0.1,
      requestType: 0.1,
      costTime: 0.1,
    },
  );

  const handleColumnResize = (dataKey: ColumnField, deltaX: number) => {
    if (!containerWidth.current) return;

    setColumnsWidth((prev) => {
      const percentDelta = deltaX / containerWidth.current;
      const newWidth = prev[dataKey] + percentDelta;
      const nextDataKey = columnField[columnField.indexOf(dataKey) + 1];
      const nextWidth = prev[nextDataKey] - percentDelta;
      if (newWidth < 0.1 || nextWidth < 0.1) return prev;
      return {
        ...prev,
        [dataKey]: newWidth,
        [nextDataKey]: nextWidth,
      };
    });
  };

  const xOfDragger = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const headerRenderer = useCallback<TableHeaderRenderer>(
    ({ dataKey, label }) => (
      <>
        <div className="flex items-center justify-between w-full">
          <div className="ReactVirtualized__Table__headerTruncatedText">
            {label}
          </div>
          {sortBy === dataKey &&
            (sortDirection === 'ASC' ? (
              <ChevronUp className="w-3.5 h-3.5 ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            ))}
        </div>
        <Draggable
          axis="x"
          defaultClassName="DragHandle"
          defaultClassNameDragging="DragHandleActive"
          onStart={() => {
            xOfDragger.current = 0;
            setIsDragging(true);
          }}
          onStop={() => {
            setTimeout(() => {
              setIsDragging(false);
            }, 100);
          }}
          onDrag={(_, val) => {
            const deltaX = val.x - xOfDragger.current;
            xOfDragger.current = val.x;
            if (deltaX === 0) return;
            handleColumnResize(dataKey as ColumnField, deltaX);
          }}
          // @ts-ignore
          position={{ x: 0 }}
          zIndex={1000}
        >
          <div onClick={(e) => e.stopPropagation()} />
        </Draggable>
      </>
    ),
    [sortBy, sortDirection],
  );
  const NameColumn = useCallback<TableCellRenderer>(({ rowData }) => {
    return (
      <div
        title={rowData.name}
        onClick={(evt: any) => {
          setShowDetail(true);
          setLeftDistance(evt.target.parentElement?.clientWidth);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            row: rowData,
          });
        }}
        style={{
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          height: '100%',
          lineHeight: '30px',
          cursor: 'pointer',
        }}
      >
        {rowData.name}
      </div>
    );
  }, []);
  const StatusColumn = useCallback<TableCellRenderer>(({ rowData }) => {
    const { status, text } = getStatusInfo(rowData);
    return status === 'unknown' ? (
      <div className="flex items-center gap-1.5">
        <span>{text}</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="cursor-pointer">
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </span>
            }
          />
          <TooltipContent>
            <span>The status code is {rowData.status}, see MDN.</span>
          </TooltipContent>
        </Tooltip>
      </div>
    ) : (
      text
    );
  }, []);

  return (
    <div
      className="network-table h-full overflow-hidden bg-card text-card-foreground"
      ref={containerRef}
    >
      <AutoSizer>
        {({ width, height }) => {
          containerWidth.current = width;
          return (
            <Table
              ref={tableRef}
              width={width}
              height={height}
              headerHeight={30}
              rowHeight={30}
              rowCount={data.length}
              rowGetter={({ index }) => data[index]}
              noRowsRenderer={NoData}
              rowClassName={({ index }) => {
                if (index < 0) return '';
                const status = getStatusInfo(data[index]).status;
                const active = data[index].id === activeRow?.id;
                return clsx(
                  'cursor-default',
                  index % 2 ? 'odd' : 'even',
                  status,
                  {
                    active,
                    'text-destructive': status === 'error',
                    'bg-destructive/15': active && status === 'error',
                    'bg-primary/15': active && status !== 'error',
                    'bg-muted/40': !active && index % 2 === 1,
                    'hover:bg-muted': !active,
                  },
                );
              }}
              onRowClick={({ rowData }) => {
                setActiveRow(rowData);
              }}
              sort={({ sortBy, sortDirection }) => {
                if (isDragging) return;
                setSortBy(sortBy as keyof ResolvedNetworkInfo);
                setSortDirection(sortDirection);
              }}
              sortBy={sortBy}
              sortDirection={sortDirection}
            >
              <Column
                dataKey="name"
                label="Name"
                width={width * columnsWidth.name}
                headerRenderer={headerRenderer}
                cellRenderer={NameColumn}
                minWidth={100}
              />
              <Column
                dataKey="pathname"
                label="Path"
                width={width * columnsWidth.pathname}
                headerRenderer={headerRenderer}
                minWidth={100}
                flexGrow={1}
              />
              <Column
                dataKey="method"
                label="Method"
                width={width * columnsWidth.method}
                headerRenderer={headerRenderer}
                minWidth={80}
              />
              <Column
                dataKey="status"
                label="Status"
                width={width * columnsWidth.status}
                headerRenderer={headerRenderer}
                cellRenderer={StatusColumn}
                minWidth={80}
              />
              <Column
                dataKey="requestType"
                label="Type"
                width={width * columnsWidth.requestType}
                headerRenderer={headerRenderer}
                minWidth={80}
              />
              <Column
                dataKey="costTime"
                label="Time(≈)"
                width={width * columnsWidth.costTime}
                cellRenderer={({ cellData }) => getTime(cellData)}
                minWidth={80}
              />
            </Table>
          );
        }}
      </AutoSizer>

      {/* Floating context menu for row */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-md border border-border bg-popover p-1 shadow-md text-popover-foreground text-xs"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full text-left px-2.5 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
            onClick={() => onMenuClick('open-in-new-tab', contextMenu.row)}
          >
            {nt('open-in-new-tab')}
          </button>
          <button
            type="button"
            className="w-full text-left px-2.5 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
            onClick={() => onMenuClick('copy-link', contextMenu.row)}
          >
            {nt('copy-link-address')}
          </button>
          <button
            type="button"
            className="w-full text-left px-2.5 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
            onClick={() => onMenuClick('copy-cURL', contextMenu.row)}
          >
            {nt('copy-as-curl')}
          </button>
          <button
            type="button"
            className="w-full text-left px-2.5 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
            onClick={() => onMenuClick('copy-full-log', contextMenu.row)}
          >
            {nt('copy-full-log')}
          </button>
        </div>
      )}

      {showDetail && activeRow && (
        <div
          className="network-detail absolute inset-y-0 right-0 grid grid-rows-[auto_1fr] border-l border-border bg-popover max-md:z-[100] max-md:w-full max-md:border-l-0 max-md:left-0!"
          style={{
            left: leftDistance,
          }}
        >
          <NetworkDetail
            data={activeRow}
            onClose={() => {
              setShowDetail(false);
            }}
          />
        </div>
      )}
    </div>
  );
};
