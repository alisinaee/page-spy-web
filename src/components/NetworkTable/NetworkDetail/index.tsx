import { SpyStorage } from '@huolala-tech/page-spy-types';
import copy from 'copy-to-clipboard';
import { Braces, Copy, Terminal } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResolvedNetworkInfo } from '@/utils';
import { message } from '@/utils/message';
import { StatusCode } from '../StatusCode';
import { validEntries } from '../utils';
import { buildCurlCommand, responseLogText } from '../body-codec';
import { QueryParamsBlock } from '../QueryParamsBlock';
import { RequestPayloadBlock } from '../RequestPayloadBlock';
import { ResponseBody } from '../ResponseBody';
import { DetailSection, KeyValueList } from '../DetailParts';

interface Props {
  data: ResolvedNetworkInfo;
  cookie?: SpyStorage.GetTypeDataItem['data'];
}

const EmptyHint = ({ text }: { text: string }) => (
  <div className="py-2 text-xs text-muted-foreground">{text}</div>
);

const HeadersTab = ({ data }: { data: ResolvedNetworkInfo }) => {
  const { requestHeader, responseHeader } = data;
  return (
    <>
      <DetailSection label="General">
        <div className="space-y-1 font-mono text-xs break-all md:text-sm">
          <div>
            <span className="font-semibold text-foreground">URL: </span>
            <span className="text-muted-foreground">{data.url}</span>
          </div>
          <div>
            <span className="font-semibold text-foreground">Method: </span>
            <span className="text-muted-foreground">{data.method}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-foreground">Status: </span>
            <span className="text-muted-foreground">
              <StatusCode data={data} />
            </span>
          </div>
        </div>
      </DetailSection>
      {[
        { label: 'Request Headers', list: requestHeader },
        { label: 'Response Headers', list: responseHeader },
      ].map(({ label, list }) => (
        <DetailSection key={label} label={label}>
          {validEntries(list) ? (
            <KeyValueList data={list} />
          ) : (
            <EmptyHint text="(empty)" />
          )}
        </DetailSection>
      ))}
    </>
  );
};

const PayloadTab = ({ data }: { data: ResolvedNetworkInfo }) => {
  const { getData, requestPayload, requestHeader } = data;
  const urlencoded = requestHeader?.some(
    ([name, value]) =>
      name.toLowerCase() === 'content-type' &&
      value.includes('application/x-www-form-urlencoded'),
  );
  return (
    <>
      {!!requestPayload?.length && (
        <RequestPayloadBlock data={requestPayload} urlencoded={urlencoded} />
      )}
      {validEntries(getData) && <QueryParamsBlock data={getData} />}
    </>
  );
};

export const NetworkDetail = memo(({ data, cookie }: Props) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('headers');

  const isStream =
    data.requestType === 'websocket' || data.requestType === 'eventsource';
  const hasPayload =
    !!data.requestPayload?.length || validEntries(data.getData);
  const visible = [
    'headers',
    ...(hasPayload ? ['payload'] : []),
    isStream ? 'messages' : 'response',
  ];
  const current = visible.includes(tab) ? tab : 'headers';

  const labels: Record<string, string> = {
    headers: t('network.tab-headers', { defaultValue: 'Headers' }),
    payload: t('network.tab-payload', { defaultValue: 'Payload' }),
    response: t('network.tab-response', { defaultValue: 'Response' }),
    messages: t('network.tab-messages', { defaultValue: 'Messages' }),
  };

  const responseText = [
    '# Response',
    `status: ${data.status ?? ''}`,
    ...(data.responseHeader || []).map(([key, value]) => `${key}: ${value}`),
    responseLogText(data.response, data.responseReason),
  ]
    .filter(Boolean)
    .join('\n');
  const fullText = [buildCurlCommand(data, cookie), '', responseText].join(
    '\n',
  );

  const onCopy = (text: string) => {
    copy(text);
    message.success(t('network.copied', { defaultValue: 'Copied' }));
  };

  return (
    <Tabs value={current} onValueChange={setTab} className="gap-0">
      <div className="flex flex-wrap gap-2 border-b border-border px-3 py-2">
        <Button
          variant="outline"
          size="touch"
          className="md:h-8 md:min-h-0 md:text-sm"
          onClick={() => onCopy(data.url)}
        >
          <Copy />
          {t('network.copy-url', { defaultValue: 'Copy URL' })}
        </Button>
        <Button
          variant="outline"
          size="touch"
          className="md:h-8 md:min-h-0 md:text-sm"
          onClick={() => onCopy(buildCurlCommand(data, cookie))}
        >
          <Terminal />
          {t('network.copy-as-curl', { defaultValue: 'Copy as cURL' })}
        </Button>
        <Button
          variant="outline"
          size="touch"
          className="md:h-8 md:min-h-0 md:text-sm"
          onClick={() => onCopy(responseText)}
        >
          <Braces />
          {t('network.copy-response', { defaultValue: 'Copy response' })}
        </Button>
        <Button
          variant="outline"
          size="touch"
          className="md:h-8 md:min-h-0 md:text-sm"
          onClick={() => onCopy(fullText)}
        >
          <Copy />
          {t('network.copy-full', { defaultValue: 'Copy full' })}
        </Button>
      </div>
      <TabsList
        variant="line"
        className="h-11 w-full justify-start overflow-x-auto rounded-none border-b border-border px-1 md:h-9"
      >
        {visible.map((key) => (
          <TabsTrigger
            key={key}
            value={key}
            className="min-h-11 flex-none px-3 text-sm md:min-h-0"
          >
            {labels[key]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="headers">
        <HeadersTab data={data} />
      </TabsContent>
      <TabsContent value="payload">
        <PayloadTab data={data} />
      </TabsContent>
      <TabsContent value="response">
        <ResponseBody data={data} />
      </TabsContent>
      <TabsContent value="messages">
        <ResponseBody data={data} />
      </TabsContent>
    </Tabs>
  );
});
