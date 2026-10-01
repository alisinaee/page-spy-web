import { ResolvedNetworkInfo } from '@/utils';
import clsx from 'clsx';
import { getStatusInfo } from '../utils';
import React from 'react';

export const StatusCode = ({ data }: { data: ResolvedNetworkInfo }) => {
  const { status, text } = getStatusInfo(data);
  const code = Number(data.status);
  const is4xx = code >= 400 && code < 500;
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={clsx(
          'status-code-circle size-2.5 shrink-0 rounded-full',
          status,
          {
            'bg-success': status === 'success',
            'bg-info': status === 'redirect',
            'bg-warning': status === 'error' && is4xx,
            'bg-destructive': status === 'error' && !is4xx,
            'bg-muted-foreground': status === 'pending' || status === 'unknown',
          },
        )}
      />
      <span>{text}</span>
    </div>
  );
};
