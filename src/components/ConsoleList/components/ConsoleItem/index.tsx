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
import './index.less';
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
        <div className="console-group">
          <div className="console-group__row">
            <Badge variant="secondary" className="console-group__tag">
              GROUP ({data.groupItems?.length})
            </Badge>
            <span
              className={
                'console-group__title console-group__title--' + data.logType
              }
              title={data.groupTitle}
            >
              {data.groupTitle}
            </span>
          </div>

          {expanded && (
            <div className="console-group-details">
              <div className="console-group-details__bar">
                <span className="console-group-details__count">
                  {data.groupItems?.length} grouped lines
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="console-group-details__copy h-7 px-2 text-xs"
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
            <code key={log.id} className="non-serializable">
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
      className={`console-item ${data.logType} ${
        expanded ? 'expanded' : 'collapsed'
      }`}
      ref={ref}
      onClick={isClickable ? toggleExpand : undefined}
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
    >
      <div className="console-item__title">
        <LogType type={data.logType} />
      </div>
      <div className="console-item__content">
        <div className="flex items-start gap-2 flex-nowrap w-full">
          <div className="shrink-0 flex items-center gap-1">
            {isClickable && (
              <span className="console-item__toggle-icon text-muted-foreground">
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
      <div className="console-item__url hidden-xs" title={data.url}>
        {getLogUrl(data.url)}
      </div>
    </div>
  );
};
