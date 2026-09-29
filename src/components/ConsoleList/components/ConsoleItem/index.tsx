import { Row, Col, Tag, Button } from 'antd';
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
import {
  RightOutlined,
  DownOutlined,
  CopyOutlined,
  CheckOutlined,
} from '@ant-design/icons';
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
        return line.replace(/\u001b\[[0-9;]*m/g, '');
      })
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
            <Tag color="purple" className="console-group__tag">
              GROUP ({data.groupItems?.length})
            </Tag>
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
                  size="small"
                  type="text"
                  className="console-group-details__copy"
                  icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={onCopyGroup}
                >
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
        <Row gutter={8} wrap={false} align="top">
          <Col
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {isClickable && (
              <span
                className="console-item__toggle-icon"
                style={{ fontSize: 10, color: '#888' }}
              >
                {expanded ? <DownOutlined /> : <RightOutlined />}
              </span>
            )}
            <Timestamp time={data.time} />
          </Col>
          <Col
            flex={1}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              overflow: 'hidden',
              maxHeight: expanded ? 'none' : '26px',
              textOverflow: expanded ? 'initial' : 'ellipsis',
              whiteSpace: expanded ? 'pre-wrap' : 'nowrap',
            }}
          >
            {content}
          </Col>
        </Row>
      </div>
      <div className="console-item__url hidden-xs" title={data.url}>
        {getLogUrl(data.url)}
      </div>
    </div>
  );
};
