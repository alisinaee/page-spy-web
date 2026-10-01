import { useCallback, useMemo } from 'react';
import { isNil } from 'lodash-es';
import { MessageItem, MessageTable } from '.';

export const EventsourceTable = ({ data }: { data: MessageItem[] }) => {
  const tableData = useMemo(
    () => data.filter((item) => !isNil(item.data)),
    [data],
  );

  const lead = useCallback(
    (item: MessageItem) =>
      item.id ? (
        <span
          className="hidden w-20 shrink-0 truncate font-mono text-xs text-muted-foreground md:block"
          title={item.id}
        >
          {item.id}
        </span>
      ) : null,
    [],
  );

  return <MessageTable type="eventsource" data={tableData} lead={lead} />;
};
