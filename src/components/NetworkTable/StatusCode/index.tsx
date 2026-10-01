import { ResolvedNetworkInfo } from '@/utils';
import clsx from 'clsx';
import { getStatusInfo } from '../utils';
import React from 'react';

export const StatusCode = ({ data }: { data: ResolvedNetworkInfo }) => {
  const { status, text } = getStatusInfo(data);
  return (
    <div className="flex items-center gap-1.5">
      <div className={clsx(['status-code-circle', status])} />
      <span>{text}</span>
    </div>
  );
};
