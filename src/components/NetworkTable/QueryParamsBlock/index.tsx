import { useState, useMemo } from 'react';
import { EntriesBody } from '@/components/EntriesBody';
import React from 'react';

export const QueryParamsBlock: React.FC<{ data: [string, string][] }> = ({
  data,
}) => {
  const [decoded, setDecoded] = useState(true);
  const decodedData = useMemo(() => {
    if (!decoded) {
      return data.reduce((acc, [key, value]) => {
        acc.push([key, encodeURIComponent(value)]);
        return acc;
      }, [] as [string, string][]);
    }
    return data;
  }, [data, decoded]);

  const toggleText = useMemo(() => {
    return decoded ? 'view URL-encoded' : 'view decoded';
  }, [decoded]);

  return (
    <div className="detail-block break-words border-b border-border px-3 py-1 text-[13px] last:border-b-0">
      <div className="detail-block__label flex items-center gap-2 font-bold leading-loose text-foreground">
        <span>Query String Parameters</span>
        <span
          onClick={() => setDecoded(!decoded)}
          className="text-xs text-primary font-normal cursor-pointer hover:underline"
        >
          {toggleText}
        </span>
      </div>
      <div className="detail-block__content mb-5 whitespace-pre-wrap pl-3 text-muted-foreground">
        <EntriesBody data={decodedData} />
      </div>
    </div>
  );
};
