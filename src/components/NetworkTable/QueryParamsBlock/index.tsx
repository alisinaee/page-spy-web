import { useState, useMemo } from 'react';
import { DetailSection, KeyValueList } from '../DetailParts';

export const QueryParamsBlock = ({ data }: { data: [string, string][] }) => {
  const [decoded, setDecoded] = useState(true);
  const shown = useMemo(
    () =>
      decoded
        ? data
        : data.map(([key, value]): [string, string] => [
            key,
            encodeURIComponent(value),
          ]),
    [data, decoded],
  );

  return (
    <DetailSection
      label="Query String Parameters"
      action={
        <button
          type="button"
          onClick={() => setDecoded(!decoded)}
          className="min-h-11 px-2 text-xs font-normal text-primary-text md:min-h-6"
        >
          {decoded ? 'view URL-encoded' : 'view decoded'}
        </button>
      }
    >
      <KeyValueList data={shown} />
    </DetailSection>
  );
};
