import { ResolvedNetworkInfo } from '@/utils';
import clsx from 'clsx';
import { getStatusInfo } from '../utils';

export const StatusCode = ({ data }: { data: ResolvedNetworkInfo }) => {
  const { status, text } = getStatusInfo(data);
  const code = Number(data.status);
  const is4xx = code >= 400 && code < 500;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className={clsx('size-2 shrink-0 rounded-full', {
          'bg-success': status === 'success',
          'bg-info': status === 'redirect',
          'bg-warning': status === 'error' && is4xx,
          'bg-destructive': status === 'error' && !is4xx,
          'bg-muted-foreground': status === 'pending' || status === 'unknown',
        })}
      />
      <span>{text}</span>
    </span>
  );
};
