import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import copy from 'copy-to-clipboard';
import { ArrowLeft, Copy, Download, Route } from 'lucide-react';
import type { SpyConsole } from '@huolala-tech/page-spy-types';
import { useSocketMessageStore } from '@/store/socket-message';
import { ConsoleList } from '@/components/ConsoleList';
import { NetworkTable } from '@/components/NetworkTable';
import {
  buildCurlCommand,
  responseLogText,
} from '@/components/NetworkTable/body-codec';
import { PanelEmpty } from '@/components/panel';
import { Button } from '@/components/ui/button';
import { ResolvedNetworkInfo } from '@/utils';
import { formatTehranDateTime } from '@/utils/tehran';
import { message } from '@/utils/message';
import useSearch from '@/utils/useSearch';
import {
  consoleLineText,
  normalizeForExport,
  routesFromConsole,
  suggestDeviceLogName,
} from '@/utils/device-session';
import { routeWindow } from '../../../../smoke-test/route-trace.js';
import { confirmLogFileName } from '../save-log-dialog';

type RouteNode = {
  id: string;
  time: number;
  operation: string;
  kind: 'page' | 'dialog' | 'sheet' | string;
  name: string;
  address: string;
  jsonUrl: string;
};

const titleOf = (node: RouteNode) =>
  node.name ||
  node.address ||
  (node.kind === 'sheet'
    ? 'Bottom sheet'
    : node.kind === 'dialog'
    ? 'Dialog'
    : 'Page');

const RouteMap = ({
  nodes,
  onLogs,
}: {
  nodes: RouteNode[];
  onLogs: (node: RouteNode) => void;
}) => (
  <ol className="mx-auto flex w-full max-w-3xl flex-col px-3 py-4 md:px-6">
    {nodes.map((node, index) => {
      const nested = node.kind === 'dialog' || node.kind === 'sheet';
      const quiet = node.operation === 'close' || node.operation === 'pop';
      return (
        <li
          key={node.id}
          className={`relative flex gap-3 pb-4 ${nested ? 'ps-8' : ''}`}
        >
          {index < nodes.length - 1 && (
            <span
              aria-hidden
              className="absolute start-[7px] top-4 bottom-0 w-px bg-border"
            />
          )}
          <span
            aria-hidden
            className={`relative z-10 mt-1.5 size-3.5 shrink-0 rounded-full border-2 border-background ${
              quiet
                ? 'bg-muted-foreground/40'
                : nested
                ? 'bg-warning'
                : 'bg-primary'
            }`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {titleOf(node)}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-xs text-muted-foreground">
                  <span>{node.operation}</span>
                  {node.address && (
                    <span className="break-all">{node.address}</span>
                  )}
                  {node.time > 0 && (
                    <span>{formatTehranDateTime(node.time)}</span>
                  )}
                </div>
                {node.jsonUrl && (
                  <div className="mt-1 break-all font-mono text-xs text-muted-foreground">
                    {node.jsonUrl}
                  </div>
                )}
              </div>
              {!quiet && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 shrink-0 md:min-h-8"
                  onClick={() => onLogs(node)}
                >
                  Logs
                </Button>
              )}
            </div>
          </div>
        </li>
      );
    })}
  </ol>
);

const networkBlock = (item: ResolvedNetworkInfo) => {
  const status =
    item.status == null || item.status === '' ? '' : String(item.status);
  const body = responseLogText(item.response, item.responseReason) || '(empty)';
  const lines = [buildCurlCommand(item), ''];
  if (status) lines.push('# Status', status, '');
  lines.push('# Response', body);
  return lines.join('\n');
};

const pageLogText = (
  node: RouteNode,
  consoleRows: SpyConsole.DataItem[],
  networkRows: ResolvedNetworkInfo[],
) => {
  const consoleLines = consoleRows.map(
    (item) => formatTehranDateTime(item.time) + ' ' + consoleLineText(item),
  );
  const networkBlocks = networkRows.map((item) => networkBlock(item));
  return [
    '# Page',
    titleOf(node),
    [node.operation, node.address, node.jsonUrl].filter(Boolean).join('\n'),
    '',
    '# Console',
    consoleLines.join('\n') || '(none)',
    '',
    '# Network',
    networkBlocks.join('\n\n') || '(none)',
  ].join('\n');
};

const downloadPageLogs = async (
  deviceId: string,
  node: RouteNode,
  consoleRows: SpyConsole.DataItem[],
  networkRows: ResolvedNetworkInfo[],
) => {
  const fileName = await confirmLogFileName(
    suggestDeviceLogName(deviceId, titleOf(node)),
  );
  if (!fileName) return;
  const blob = new Blob(
    [
      JSON.stringify(
        normalizeForExport({
          exportedAt: formatTehranDateTime(new Date()),
          deviceId,
          section: 'route',
          page: {
            name: node.name,
            operation: node.operation,
            kind: node.kind,
            address: node.address,
            jsonUrl: node.jsonUrl,
            time: node.time,
          },
          console: consoleRows,
          network: networkRows,
        }),
        null,
        2,
      ),
    ],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.endsWith('.json') ? fileName : fileName + '.json';
  anchor.click();
  URL.revokeObjectURL(url);
};

const RoutePanel = () => {
  const [consoleMsg, networkMsg] = useSocketMessageStore(
    useShallow((state) => [state.consoleMsg, state.networkMsg]),
  );
  const [focus, setFocus] = useState<string | null>(null);
  const [logTab, setLogTab] = useState<'console' | 'network'>('console');

  const { address = '' } = useSearch();
  const nodes = useMemo(
    () => routesFromConsole(consoleMsg) as RouteNode[],
    [consoleMsg],
  );

  const selected = nodes.find((node) => node.id === focus) || null;
  const span = selected ? routeWindow(nodes, selected.id) : null;
  const consoleRows = useMemo(() => {
    if (!span) return [];
    return consoleMsg.filter((item) => {
      const time = item.time || 0;
      return time >= span.start && time < span.end;
    });
  }, [consoleMsg, span]);
  const networkRows = useMemo(() => {
    if (!span) return [];
    return networkMsg.filter((item) => {
      const time = Number(item.startTime) || 0;
      return time >= span.start && time < span.end;
    });
  }, [networkMsg, span]);

  if (!nodes.length) {
    return (
      <PanelEmpty
        icon={<Route />}
        title="No routes yet"
        description="Open a page, dialog, or bottom sheet on the device. The map fills in from those navigation logs."
      />
    );
  }

  if (selected && span) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-start gap-2 border-b border-border px-2 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11 md:min-h-8 md:min-w-8"
            aria-label="Back to route map"
            onClick={() => setFocus(null)}
          >
            <ArrowLeft />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {titleOf(selected)}
            </div>
            <div className="truncate font-mono text-xs text-muted-foreground">
              {selected.address || selected.operation}
            </div>
            {selected.jsonUrl && (
              <div className="break-all font-mono text-xs text-muted-foreground">
                {selected.jsonUrl}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 border-b border-border px-3 py-2">
          {(['console', 'network'] as const).map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={logTab === key ? 'default' : 'outline'}
              className="min-h-11 capitalize md:min-h-8"
              onClick={() => setLogTab(key)}
            >
              {key}{' '}
              {key === 'console' ? consoleRows.length : networkRows.length}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 md:min-h-8"
            onClick={() => {
              const ok = copy(pageLogText(selected, consoleRows, networkRows));
              if (ok) message.success('Copied');
              else message.error('Copy failed');
            }}
          >
            <Copy />
            Copy all
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 md:min-h-8"
            onClick={() => {
              void downloadPageLogs(
                address,
                selected,
                consoleRows,
                networkRows,
              );
            }}
          >
            <Download />
            Download all
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          {logTab === 'console' ? (
            consoleRows.length ? (
              <div className="min-h-0 flex-1">
                <ConsoleList data={consoleRows} onScroll={() => undefined} />
              </div>
            ) : (
              <PanelEmpty
                icon={<Route />}
                title="No console logs on this page"
              />
            )
          ) : networkRows.length ? (
            <NetworkTable
              data={networkRows}
              filterType="All"
              filterKeyword=""
            />
          ) : (
            <PanelEmpty
              icon={<Route />}
              title="No network requests on this page"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <RouteMap nodes={nodes} onLogs={(node) => setFocus(node.id)} />
    </div>
  );
};

export default RoutePanel;
