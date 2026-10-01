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
  expanded: boolean;
  onToggle: () => void;
  onHeightChange: (height: number) => void;
}

export const ConsoleItem = ({
  data,
  expanded,
  onToggle,
  onHeightChange,
}: Props) => {
  const { t } = useTranslation();
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

  const toggleExpand = onToggle;

  const [rowCopied, setRowCopied] = useState(false);
  const onCopyRow = useCallback(() => {
    const text = data.isGroup ? '' : rawText;
    if (text && copy(text)) {
      setRowCopied(true);
      setTimeout(() => setRowCopied(false), 1500);
    }
  }, [data.isGroup, rawText]);

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

  const onCopyGroup = useCallback(() => {
    if (groupFullText && copy(groupFullText)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [groupFullText]);

  const content = useMemo(() => {
    if (data.isGroup) {
      return (
        <div className="console-group flex w-full flex-col">
          <div className="console-group__row flex w-full min-w-0 flex-nowrap items-center gap-1.5">
            <Badge
              variant="secondary"
              className="console-group__tag m-0 shrink-0 rounded px-1.5 text-xs font-semibold"
            >
              GROUP ({data.groupItems?.length})
            </Badge>
            <span
              className={clsx(
                'console-group__title console-group__title--' + data.logType,
                'min-w-0 truncate font-semibold',
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
  }, [data, t]);

  const toggleLabel = expanded
    ? t('console.collapse', { defaultValue: 'Collapse' })
    : t('console.expand', { defaultValue: 'Expand' });

  return (
    <div
      className={clsx(
        'console-item flex min-h-11 items-start gap-1 border-b border-border pr-1 pl-1 text-sm transition-colors hover:bg-muted/60 md:min-h-9 md:text-sm',
        data.logType,
        expanded ? 'expanded' : 'collapsed',
        isClickable && 'cursor-pointer',
        {
          'text-primary-text': data.logType === 'debug',
          'bg-warning/10 text-warning': data.logType === 'warn',
          'bg-destructive/10 text-destructive': data.logType === 'error',
        },
      )}
      ref={ref}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-expanded={isClickable ? expanded : undefined}
      aria-label={isClickable ? toggleLabel : undefined}
      onClick={
        isClickable
          ? (event) => {
              const target = event.target as HTMLElement;
              if (target.closest('button, a, input, textarea')) return;
              toggleExpand();
            }
          : undefined
      }
      onKeyDown={
        isClickable
          ? (event) => {
              const target = event.target as HTMLElement;
              if (target.closest('button, a, input, textarea')) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleExpand();
              }
            }
          : undefined
      }
    >
      {isClickable ? (
        <div className="console-item__title mt-1.5 flex w-8 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md text-muted-foreground">
          <LogType type={data.logType} />
          {expanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </div>
      ) : (
        <div className="console-item__title mt-1.5 flex w-8 shrink-0 items-center justify-center">
          <LogType type={data.logType} />
        </div>
      )}
      <div className="console-item__content flex min-w-0 flex-1 flex-col justify-center py-1.5">
        <div
          className="flex min-w-0 flex-1 flex-wrap overflow-hidden"
          style={{
            maxHeight: expanded ? 'none' : '22px',
            textOverflow: expanded ? 'initial' : 'ellipsis',
            whiteSpace: expanded ? 'pre-wrap' : 'nowrap',
          }}
        >
          {content}
        </div>
        <div className="mt-0.5 flex min-w-0 items-baseline gap-2 text-[11px] leading-4 text-muted-foreground">
          <Timestamp time={data.time} />
          <span className="min-w-0 truncate font-mono" title={data.url}>
            {getLogUrl(data.url)}
          </span>
        </div>
        {expanded && data.isGroup && (
          <div className="console-group-details mt-2 max-h-[450px] w-full overflow-y-auto whitespace-pre-wrap wrap-break-word rounded-md border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed text-foreground md:text-sm">
            <div className="console-group-details__bar mb-1.5 flex items-center justify-between border-b border-border pb-1">
              <span className="console-group-details__count text-xs text-muted-foreground">
                {t('console.grouped-lines', {
                  count: data.groupItems?.length,
                  defaultValue: '{{count}} grouped lines',
                })}
              </span>
              <Button
                size="icon-touch"
                variant="ghost"
                aria-label={
                  copied
                    ? t('common.copied')!
                    : t('common.copy', { defaultValue: 'Copy' })!
                }
                className="console-group-details__copy text-muted-foreground md:size-8 md:min-h-0 md:min-w-0"
                onClick={(event) => {
                  event.stopPropagation();
                  onCopyGroup();
                }}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            {groupFullText}
          </div>
        )}
      </div>
      {!data.isGroup && rawText && (
        <Button
          variant="ghost"
          size="icon-touch"
          aria-label={
            rowCopied
              ? t('common.copied')!
              : t('common.copy', { defaultValue: 'Copy' })!
          }
          onClick={(event) => {
            event.stopPropagation();
            onCopyRow();
          }}
          className="mt-1 shrink-0 self-start text-muted-foreground md:size-8 md:min-h-0 md:min-w-0"
        >
          {rowCopied ? <Check /> : <Copy />}
        </Button>
      )}
    </div>
  );
};
