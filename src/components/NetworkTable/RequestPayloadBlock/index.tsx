import { isString } from 'lodash-es';
import { useMemo } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { ColoredJson } from '../ColoredJson';
import { LOST_REQUEST_BODIES } from '../body-codec';
import { DetailSection, KeyValueList } from '../DetailParts';

export const RequestPayloadBlock = ({
  data,
  urlencoded = false,
}: {
  data: string | [string, string][];
  urlencoded?: boolean;
}) => {
  const content = useMemo(() => {
    if (isString(data)) {
      if (LOST_REQUEST_BODIES.has(data)) {
        return (
          <Alert className="border-warning/50 bg-warning/10 text-warning">
            <AlertCircle className="size-4" />
            <AlertTitle>Request body not captured</AlertTitle>
            <AlertDescription className="mt-1 text-xs text-muted-foreground">
              Client sent raw bytes. This session only stored a placeholder, so
              the POST body and cURL cannot include the real data. Reload the
              app after the debugger SDK update, then capture the call again.
            </AlertDescription>
          </Alert>
        );
      }
      if (urlencoded)
        return <KeyValueList data={[...new URLSearchParams(data)]} />;
      return <ColoredJson value={data} />;
    }
    return <KeyValueList data={data} />;
  }, [data, urlencoded]);
  return <DetailSection label="Request Payload">{content}</DetailSection>;
};
