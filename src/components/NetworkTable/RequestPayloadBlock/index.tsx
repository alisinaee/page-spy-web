import { isString } from 'lodash-es';
import { useMemo } from 'react';
import { Alert } from 'antd';
import { EntriesBody } from '@/components/EntriesBody';
import { ColoredJson } from '../ColoredJson';
import { LOST_REQUEST_BODIES } from '../body-codec';

export const RequestPayloadBlock: React.FC<{
  data: string | [string, string][];
  urlencoded?: boolean;
}> = ({ data, urlencoded = false }) => {
  const content = useMemo(() => {
    if (isString(data)) {
      if (LOST_REQUEST_BODIES.has(data)) {
        return (
          <Alert
            type="warning"
            showIcon
            message="Request body not captured"
            description="Client sent raw bytes. This session only stored a placeholder, so the POST body and cURL cannot include the real data. Reload the app after the debugger SDK update, then capture the call again."
          />
        );
      }
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
