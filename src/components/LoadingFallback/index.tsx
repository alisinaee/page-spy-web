import React from 'react';
import { Spinner } from '@/components/ui/spinner';

export const LoadingFallback = ({
  style = {},
  className = '',
}: {
  style?: React.CSSProperties;
  className?: string;
}) => {
  return (
    <div
      className={`loading-fallback flex h-full min-h-[100px] items-center justify-center p-8 ${className}`}
      style={style}
    >
      <Spinner className="h-8 w-8 text-primary" />
    </div>
  );
};
