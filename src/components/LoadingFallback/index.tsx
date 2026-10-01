import React from 'react';
import { Spinner } from '@/components/ui/spinner';
import './index.less';

export const LoadingFallback = ({
  style = {},
  className = '',
}: {
  style?: React.CSSProperties;
  className?: string;
}) => {
  return (
    <div
      className={`loading-fallback flex items-center justify-center p-8 ${className}`}
      style={style}
    >
      <Spinner className="h-8 w-8 text-primary" />
    </div>
  );
};
