import { memo } from 'react';

interface TimestampTypes {
  time?: number;
}

function getLocalTime(nS: number) {
  // return new Date(nS).toLocaleString().replace(/:\d{1,2}$/, ' ');
  return new Date(nS).toLocaleString();
}

const Timestamp = memo((props: TimestampTypes) => {
  const { time = Date.now() } = props;
  return (
    <span className="timestamp inline-block font-mono text-xs font-medium text-muted-foreground">
      {getLocalTime(time)}
    </span>
  );
});

export default Timestamp;
