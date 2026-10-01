import { ResolvedNetworkInfo } from '@/utils';
import { dataUrlToBlob, downloadFile, semanticSize } from '../utils';
import { withPopup, usePopupRef } from '@/utils/withPopup';
import { Download } from 'lucide-react';
import { ColoredJson } from '../ColoredJson';
import { useState, useMemo } from 'react';
import { EventsourceTable } from './MessageTable/EventsourceTable';
import { WebsocketTable } from './MessageTable/WebsocketTable';
import { isPlainObject } from 'lodash-es';
import { PLACEHOLDER_RESPONSE } from '@/utils/constants';
import { decodeDataUrl, isTextLike, parseMediaSummary } from '../body-codec';
import { message } from '@/utils/message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import React from 'react';

const FilenameModal = withPopup<void, string | false>(
  ({ visible, resolve }) => {
    const [filename, setFilename] = useState('');

    const ok = () => {
      const val = filename.trim();
      if (val) {
        resolve(val);
      } else {
        message.error('File name cannot be empty');
      }
    };

    return (
      <Dialog
        open={visible}
        onOpenChange={(open) => {
          if (!open) resolve(false);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Download</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <label className="text-xs text-muted-foreground font-medium">
              Save as
            </label>
            <Input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Input file name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') ok();
              }}
              autoFocus
            />
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => resolve(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={ok}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);

interface MediaWidgetProps {
  dataUrl: string;
}
const MediaWidget = ({ dataUrl }: MediaWidgetProps) => {
  const popupRef = usePopupRef<void, string | false>();

  // response ==> Blob
  const { blob, mime, data } = dataUrlToBlob(dataUrl);

  if (!blob || !mime) {
    return (
      <Alert className="border-destructive/40 bg-destructive/10 text-destructive">
        <AlertDescription className="text-xs">
          <span>Auto load failed. Following is the origin data:</span>
          <br />
          <span>{String(data)}</span>
        </AlertDescription>
      </Alert>
    );
  }

  const showModal = async () => {
    const filename = await popupRef.current?.popup();
    if (filename) {
      const url = URL.createObjectURL(blob);
      downloadFile(filename, url);
      URL.revokeObjectURL(url);
      message.success('Download success!');
    }
  };

  // image/jpeg / image/png .etc.
  if (mime.indexOf('image') > -1) {
    return (
      <img
        src={dataUrl}
        className="response-blob-image mx-auto block max-w-[80%]"
        alt="Response"
      />
    );
  }
  return (
    <div className="media-widget space-y-2">
      {[
        { label: 'File type: ', content: mime },
        {
          label: 'File size: ',
          content: semanticSize(blob.size),
        },
        {
          label: 'Save as: ',
          content: (
            <Button onClick={showModal} size="sm" className="ml-3 h-7 text-xs">
              <Download className="h-3.5 w-3.5 mr-1" />
              Download
            </Button>
          ),
        },
      ].map(({ label, content }) => (
        <div className="content-item flex items-center text-xs" key={label}>
          <b className="content-item__label text-muted-foreground mr-2">
            {label}
          </b>
          <span className="content-item__value">{content}</span>
        </div>
      ))}
      <FilenameModal ref={popupRef} />
    </div>
  );
};

interface ResponseBodyProps {
  data: ResolvedNetworkInfo;
}
export const ResponseBody = ({ data }: ResponseBodyProps) => {
  const bodyContent = useMemo(() => {
    // response ==> DataURL
    const { response, responseType, responseReason, requestType } = data;

    if (!response || response === PLACEHOLDER_RESPONSE)
      return (
        <div className="text-center py-10 text-muted-foreground text-xs">
          No response content
        </div>
      );
    if (requestType === 'eventsource') {
      return (
        <EventsourceTable
          data={isPlainObject(response) ? [response] : response}
        />
      );
    }
    if (requestType === 'websocket') {
      return (
        <WebsocketTable
          data={isPlainObject(response) ? [response] : response}
        />
      );
    }
    if (['blob', 'arraybuffer'].includes(responseType)) {
      if (typeof response === 'string') {
        const decoded = decodeDataUrl(response);
        if (decoded && isTextLike(decoded.mime, decoded.text)) {
          return <ColoredJson value={decoded.text} />;
        }
      }
      if (responseReason) {
        return (
          <Alert className="border-destructive/40 bg-destructive/10 text-destructive text-xs">
            <AlertDescription>{responseReason}</AlertDescription>
          </Alert>
        );
      }
      const mediaSummary = parseMediaSummary(response);
      if (mediaSummary) {
        return (
          <div className="media-widget space-y-2">
            {[
              { label: 'File type: ', content: mediaSummary.type },
              {
                label: 'File size: ',
                content: semanticSize(mediaSummary.size),
              },
            ].map(({ label, content }) => (
              <div
                className="content-item flex items-center text-xs"
                key={label}
              >
                <b className="content-item__label text-muted-foreground mr-2">
                  {label}
                </b>
                <span className="content-item__value">{content}</span>
              </div>
            ))}
          </div>
        );
      }
      return <MediaWidget dataUrl={response} />;
    }

    return <ColoredJson value={response} />;
  }, [data]);

  return <div className="response-body h-full p-2">{bodyContent}</div>;
};
