import { isString } from 'lodash-es';
import { useMemo } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { EntriesBody } from '@/components/EntriesBody';
import { ColoredJson } from '../ColoredJson';
import { LOST_REQUEST_BODIES } from '../body-codec';
import React from 'react';

export const RequestPayloadBlock: React.FC<{
  data: string | [string, string][];
  urlencoded?: boolean;
}> = ({ data, urlencoded = false }) => {
  const content = useMemo(() => {
    if (isString(data)) {
      if (LOST_REQUEST_BODIES.has(data)) {
        return (
          <Alert className="border-warning/50 bg-warning/10 text-warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Request body not captured</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground mt-1">
              Client sent raw bytes. This session only stored a placeholder, so
              the POST body and cURL cannot include the real data. Reload the
              app after the debugger SDK update, then capture the call again.
            </AlertDescription>
          </Alert>
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
    <div className="detail-block break-words border-b border-border px-3 py-1 text-[13px] last:border-b-0">
      <b className="detail-block__label font-bold leading-loose text-foreground">
        Request Payload
      </b>
      <div className="detail-block__content mb-5 whitespace-pre-wrap pl-3 text-muted-foreground">
        {content}
      </div>
    </div>
  );
};
