import { ArrowDown, ArrowUp } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { isNil } from 'lodash-es';
import { MessageItem, MessageTable } from '.';

interface WebsocketData {
  id: string;
  data: { type: 'send' | 'receive'; data: string; timestamp: number };
  timestamp: number;
}

export const WebsocketTable = ({ data }: { data: WebsocketData[] }) => {
  const tableData = useMemo<MessageItem[]>(() => {
    return (data || [])
      .map((item) => ({ ...item, ...item.data }))
      .filter((item) => !isNil(item.data)) as unknown as MessageItem[];
  }, [data]);

  const lead = useCallback((item: MessageItem) => {
    const isSend = item.type === 'send';
    const Icon = isSend ? ArrowUp : ArrowDown;
    return (
      <Icon
        aria-label={isSend ? 'Sent' : 'Received'}
        className={
          isSend ? 'size-4 shrink-0 text-success' : 'size-4 shrink-0 text-info'
        }
      />
    );
  }, []);

  const extra = useCallback((item: MessageItem) => item.data.length, []);

  return (
    <MessageTable type="websocket" data={tableData} lead={lead} extra={extra} />
  );
};
