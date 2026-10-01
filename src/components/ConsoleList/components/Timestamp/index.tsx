import { memo } from 'react';
import { formatTehranDateTime } from '@/utils/tehran';

interface TimestampTypes {
  time?: number;
}

const Timestamp = memo((props: TimestampTypes) => {
  const { time = Date.now() } = props;
  const date = new Date(time);
  const label = formatTehranDateTime(date);
  return (
    <time
      dateTime={date.toISOString()}
      title={label}
      className="timestamp shrink-0 font-mono text-xs text-muted-foreground"
    >
      {label}
    </time>
  );
});

export default Timestamp;
