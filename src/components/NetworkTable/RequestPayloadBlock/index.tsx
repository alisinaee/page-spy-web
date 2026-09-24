import { isString } from 'lodash-es';
import { useMemo } from 'react';
import { EntriesBody } from '@/components/EntriesBody';
import { ColoredJson } from '../ColoredJson';

export const RequestPayloadBlock: React.FC<{
  data: string | [string, string][];
  urlencoded?: boolean;
}> = ({ data, urlencoded = false }) => {
  const content = useMemo(() => {
    if (isString(data)) {
      if (urlencoded) {
        const params = new URLSearchParams(data);
        return <EntriesBody data={[...params]} />;
      }
      return <ColoredJson value={data} />;
    }
    return <EntriesBody data={data} />;
  }, [data, urlencoded]);
  return (
    <div className="detail-block">
      <b className="detail-block__label">Request Payload</b>
      <div className="detail-block__content">{content}</div>
    </div>
  );
};
