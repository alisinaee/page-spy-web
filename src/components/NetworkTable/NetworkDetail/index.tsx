import { EntriesBody } from '@/components/EntriesBody';
import { getObjectKeys, ResolvedNetworkInfo } from '@/utils';
import { ReactNode, memo, useEffect, useMemo, useState } from 'react';
import { PartOfHeader } from '../PartOfHeader';
import { StatusCode } from '../StatusCode';
import { validEntries } from '../utils';
import { QueryParamsBlock } from '../QueryParamsBlock';
import { RequestPayloadBlock } from '../RequestPayloadBlock';
import { ResponseBody } from '../ResponseBody';
import clsx from 'clsx';
import { X } from 'lucide-react';
import React from 'react';

interface Props {
  data: ResolvedNetworkInfo;
  onClose: () => void;
}

const generalFieldMap = {
  'Request URL': 'url',
  'Request Method': 'method',
} as const;

interface TabItem {
  title: string;
  visible: (data: ResolvedNetworkInfo) => boolean;
  content: (data: ResolvedNetworkInfo) => ReactNode;
}

const TABS: TabItem[] = [
  {
    title: 'Headers',
    visible: () => true,
    content: (data) => {
      const { requestHeader, responseHeader } = data;
      const headerContent = [
        {
          label: 'Request Header',
          data: validEntries(requestHeader) ? requestHeader : [],
        },
        {
          label: 'Response Header',
          data: validEntries(responseHeader) ? responseHeader : [],
        },
      ];
      return (
        <>
          {/* General */}
          <div className="detail-block break-words border-b border-border px-3 py-1 text-[13px] last:border-b-0">
            <div className="detail-block__label font-bold leading-loose text-foreground">
              General Info
            </div>
            <div className="detail-block__content mb-5 whitespace-pre-wrap pl-3 text-muted-foreground">
              {getObjectKeys(generalFieldMap).map((label) => {
                const field = generalFieldMap[label];
                return (
                  <div className="entries-item leading-[1.7]" key={label}>
                    <b className="entries-item__label whitespace-nowrap">
                      {label}: &nbsp;
                    </b>
                    <span className="entries-item__value break-all">
                      <code>{data[field]}</code>
                    </span>
                  </div>
                );
              })}

              <div className="entries-item leading-[1.7]">
                <b className="entries-item__label whitespace-nowrap">
                  Status Code: &nbsp;
                </b>
                <span className="entries-item__value break-all">
                  <code>
                    <StatusCode data={data} />
                  </code>
                </span>
              </div>
            </div>
          </div>
          {/* Header Content */}
          {headerContent.map((item) => {
            return (
              <div
                className="detail-block break-words border-b border-border px-3 py-1 text-[13px] last:border-b-0"
                key={item.label}
              >
                <div className="detail-block__label flex items-center gap-2 font-bold leading-loose text-foreground">
                  <span>{item.label}</span>
                  <PartOfHeader />
                </div>
                <div className="detail-block__content mb-5 whitespace-pre-wrap pl-3 text-muted-foreground">
                  {item.data?.length ? (
                    <EntriesBody data={item.data} />
                  ) : (
                    <div className="text-muted-foreground text-center py-2 text-xs">
                      (empty)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      );
    },
  },
  {
    title: 'Payload',
    visible: (data) => {
      const { getData, requestPayload } = data;
      return !!requestPayload?.length || validEntries(getData);
    },
    content: (data) => {
      const { getData, requestPayload, requestHeader } = data;
      const isFormUrlencoded = requestHeader?.some(([name, value]) => {
        if (
          name.toLowerCase() === 'content-type' &&
          value.includes('application/x-www-form-urlencoded')
        )
          return true;
        return false;
      });

      return (
        <>
          {/* Request Payload */}
          {!!requestPayload?.length && (
            <RequestPayloadBlock
              data={requestPayload}
              urlencoded={isFormUrlencoded}
            />
          )}

          {/* Query String Parametes */}
          {validEntries(getData) && <QueryParamsBlock data={getData} />}
        </>
      );
    },
  },
  {
    title: 'EventStream',
    visible: (data) => {
      return data.requestType === 'eventsource';
    },
    content: (data) => {
      return <ResponseBody data={data} />;
    },
  },
  {
    title: 'Response',
    visible: (data) => {
      return data.requestType !== 'eventsource';
    },
    content: (data) => {
      return <ResponseBody data={data} />;
    },
  },
];

export const NetworkDetail = memo(({ data, onClose }: Props) => {
  const [activeTab, setActiveTab] = useState('Headers');
  const activeContent = useMemo(() => {
    const tabItem = TABS.find((t) => t.title === activeTab);
    if (!tabItem)
      return <div className="text-center py-4 text-xs">No content</div>;
    return tabItem.content(data);
  }, [activeTab, data]);

  useEffect(() => {
    const ul = document.querySelector(
      '.network-detail-tabs',
    ) as HTMLUListElement;
    if (!ul) return;

    const li = document.querySelector(
      `[data-tab-id="${activeTab}"]`,
    ) as HTMLLIElement;
    if (!li) {
      setActiveTab('Headers');
      return;
    }

    const ulRect = ul.getBoundingClientRect();
    const liRect = li.getBoundingClientRect();
    ul.style.setProperty('--width', `${liRect.width}px`);
    ul.style.setProperty('--left', `${liRect.left - ulRect.left}px`);
  }, [data, activeTab]);

  return (
    <>
      <div className="network-detail-header relative flex h-[30px] items-center justify-between border-b border-border bg-card">
        <div
          className="network-detail-close flex w-8 cursor-pointer justify-center p-1 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </div>
        <ul className="network-detail-tabs flex list-none">
          {TABS.filter((t) => t.visible(data)).map((i) => {
            return (
              <li
                key={i.title}
                data-tab-id={i.title}
                className={clsx('cursor-pointer px-3 py-1.5 hover:bg-muted', {
                  active: activeTab === i.title,
                  'text-primary-text': activeTab === i.title,
                })}
                onClick={() => {
                  setActiveTab(i.title);
                }}
              >
                {i.title}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="network-detail-content overflow-auto">
        {activeContent}
      </div>
    </>
  );
});
