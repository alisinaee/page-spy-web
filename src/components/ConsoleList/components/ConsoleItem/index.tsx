import copy from 'copy-to-clipboard';
import ConsoleNode from '../ConsoleNode';
import {
  ErrorTraceNode,
  getStackFramesIfErrorTrace,
  getStackFramesIfErrorConsole,
} from '../ConsoleNode/ErrorTrace';
import {
  isPlaceholderNode,
  PlaceholderNode,
} from '../ConsoleNode/PlaceholderNode';
import LogType from '../LogType';
import { getLogUrl } from '@/utils';
import './index.css';
import clsx from 'clsx';
import Timestamp from '../Timestamp';
import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import ReactJsonView from '@huolala-tech/react-json-view';
import { useTranslation } from 'react-i18next';
import { useSize } from 'ahooks';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GroupedConsoleItem } from '../../index';

interface Props {
  data: GroupedConsoleItem;
  onHeightChange: (height: number) => void;
}

export const ConsoleItem = ({ data, onHeightChange }: Props) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const height = useRef(0);
  const size = useSize(ref);

  useEffect(() => {
    const latestHeight = size?.height ?? 0;
    if (latestHeight && latestHeight !== height.current) {
      height.current = latestHeight;
      onHeightChange(latestHeight);
    }
  }, [size, onHeightChange]);

  const rawText = useMemo(() => {
    return (
      data.logs
        ?.map((l) =>
          typeof l.value === 'string' ? l.value : JSON.stringify(l.value ?? ''),
        )
        .join(' ') || ''
    );
  }, [data.logs]);

  const isLongLog = useMemo(() => {
    return rawText.length > 120 || rawText.indexOf('\n') !== -1;
  }, [rawText]);

  const isClickable = Boolean(data.isGroup || isLongLog);

  const toggleExpand = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.rjv') ||
      target.closest('a') ||
      target.closest('button') ||
      target.closest('.ant-btn')
    ) {
      return;
    }
    setExpanded((prev) => !prev);
  }, []);

  const groupFullText = useMemo(() => {
    if (!data.isGroup || !data.groupItems) return '';
    const BOX_CHARS_REGEX = /[┌┐└┘│├┤┬┴┼─]/;
    const isBoxSeparator = (line: string) => {
      const stripped = line.replace(/\u001b\[[0-9;]*m/g, '').trim();
      if (!stripped) return false;
      return (
        /^[┌┐└┘│├┤┬┴┼─\s_\-]+$/.test(stripped) && BOX_CHARS_REGEX.test(stripped)
      );
    };
    const stripBoxBorder = (line: string) => {
      const cleaned = line.replace(/\u001b\[[0-9;]*m/g, '');
      return cleaned.replace(/^[ \t]*│ ?/, '').replace(/ ?│[ \t]*$/, '');
    };

    return data.groupItems
      .map((it) => {
        const line =
          it.logs
            ?.map((l) =>
              typeof l.value === 'string'
                ? l.value
                : JSON.stringify(l.value ?? ''),
            )
            .join(' ') || '';
        return line;
      })
      .filter((line) => !isBoxSeparator(line))
      .map((line) => stripBoxBorder(line))
      .join('\n');
  }, [data]);

  const onCopyGroup = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (groupFullText && copy(groupFullText)) {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    },
    [groupFullText],
  );

  const content = useMemo(() => {
    if (data.isGroup) {
      return (
        <div className="console-group flex w-full flex-col">
          <div className="console-group__row flex w-full min-w-0 flex-nowrap items-center gap-1.5">
            <Badge
              variant="secondary"
              className="console-group__tag m-0 shrink-0 rounded px-1.5 text-[11px] font-semibold leading-[18px]"
            >
              GROUP ({data.groupItems?.length})
            </Badge>
            <span
              className={clsx(
                'console-group__title console-group__title--' + data.logType,
                'max-w-[calc(100vw-160px)] truncate font-semibold',
                {
                  'text-foreground':
                    data.logType !== 'error' && data.logType !== 'warn',
                  'text-destructive': data.logType === 'error',
                  'text-warning': data.logType === 'warn',
                },
              )}
              title={data.groupTitle}
            >
              {data.groupTitle}
            </span>
          </div>

          {expanded && (
            <div className="console-group-details mt-2 max-h-[450px] w-full overflow-y-auto whitespace-pre-wrap break-all rounded-md border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed text-foreground">
              <div className="console-group-details__bar mb-1.5 flex items-center justify-between border-b border-border pb-1">
                <span className="console-group-details__count text-[11px] text-muted-foreground">
                  {data.groupItems?.length} grouped lines
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="console-group-details__copy h-[22px] px-2 text-[11px] text-muted-foreground"
                  onClick={onCopyGroup}
                >
                  {copied ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              {groupFullText}
            </div>
          )}
        </div>
      );
    }

    if (isPlaceholderNode(data)) {
      return <PlaceholderNode data={data.logs} />;
    }
    const framesOfErrorTrace = getStackFramesIfErrorTrace(data);
    if (framesOfErrorTrace) {
      return <ErrorTraceNode data={framesOfErrorTrace} />;
    }
    return data.logs?.map((log) => {
      const framesOfErrorConsole = getStackFramesIfErrorConsole(log);
      if (framesOfErrorConsole) {
        return <ErrorTraceNode data={framesOfErrorConsole} key={log.id} />;
      }
      if (log.type === 'json') {
        if (log.value === null) {
          return (
            <code
              key={log.id}
              className="non-serializable text-xs text-muted-foreground"
            >
              {t('console.non-serializable')}
            </code>
          );
        }
        return <ReactJsonView source={JSON.parse(log.value)} key={log.id} />;
      }
      return <ConsoleNode data={log} key={log.id} />;
    });
  }, [data, t, expanded, groupFullText, copied, onCopyGroup]);

  return (
    <div
      className={clsx(
        'console-item flex min-h-[27px] whitespace-pre-wrap border-t border-border px-2 py-1 text-xs transition-colors first:border-t-0 last:border-b hover:bg-muted',
        data.logType,
        expanded ? 'expanded' : 'collapsed',
        {
          'text-primary-text': data.logType === 'debug',
          'bg-warning/10 text-warning': data.logType === 'warn',
          'bg-destructive/10 text-destructive': data.logType === 'error',
        },
      )}
      ref={ref}
      onClick={isClickable ? toggleExpand : undefined}
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
    >
      <div className="console-item__title mt-0.5">
        <LogType type={data.logType} />
      </div>
      <div className="console-item__content min-w-0 flex-1">
        <div className="flex items-start gap-2 flex-nowrap w-full">
          <div className="shrink-0 flex items-center gap-1">
            {isClickable && (
              <span className="console-item__toggle-icon inline-flex size-3.5 cursor-pointer select-none items-center justify-center text-muted-foreground">
                {expanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </span>
            )}
            <Timestamp time={data.time} />
          </div>
          <div
            className="flex-1 flex flex-wrap overflow-hidden"
            style={{
              maxHeight: expanded ? 'none' : '26px',
              textOverflow: expanded ? 'initial' : 'ellipsis',
              whiteSpace: expanded ? 'pre-wrap' : 'nowrap',
            }}
          >
            {content}
          </div>
        </div>
      </div>
      <div
        className="console-item__url hidden-xs max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground underline transition-colors hover:text-foreground max-[992px]:hidden"
        title={data.url}
      >
        {getLogUrl(data.url)}
      </div>
    </div>
  );
};
