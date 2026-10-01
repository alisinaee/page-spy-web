import { useState } from 'react';
import { SpyNetwork } from '@huolala-tech/page-spy-types';
import clsx from 'clsx';
import React from 'react';

export type NetworkType =
  | 'All'
  | 'Fetch/XHR'
  | 'CSS'
  | 'JS'
  | 'Img'
  | 'Socket'
  | 'Other';

export const RESOURCE_TYPE: Map<
  NetworkType,
  (type: SpyNetwork.RequestType) => boolean
> = new Map([
  ['All', () => true],
  [
    'Fetch/XHR',
    (type: SpyNetwork.RequestType) =>
      /(fetch|xhr|mp-request|mp-upload|eventsource)/.test(type),
  ],
  ['Socket', (type: SpyNetwork.RequestType) => /(websocket)/.test(type)],
  ['CSS', (type: SpyNetwork.RequestType) => /css/.test(type)],
  ['JS', (type: SpyNetwork.RequestType) => /script/.test(type)],
  ['Img', (type: SpyNetwork.RequestType) => /img/.test(type)],
  [
    'Other',
    (type: SpyNetwork.RequestType) =>
      !/(fetch|xhr|mp-request|mp-upload|eventsource|css|script|img|audio|video)/.test(
        type,
      ),
  ],
]);

interface Props {
  size?: 'small' | 'middle' | 'large';
  value?: NetworkType;
  onChange: (type: NetworkType) => void;
}

export const TypeFilter = ({
  size = 'middle',
  value = 'All',
  onChange,
}: Props) => {
  const [type, setType] = useState<NetworkType>(value);

  return (
    <div className="inline-flex items-center rounded-lg bg-secondary/80 p-0.5 border border-border">
      {[...RESOURCE_TYPE.keys()].map((key) => (
        <button
          key={key}
          type="button"
          className={clsx(
            'rounded-md font-medium transition-all cursor-pointer whitespace-nowrap',
            size === 'small' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
            type === key
              ? 'bg-background text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => {
            setType(key);
            onChange(key);
          }}
        >
          {key}
        </button>
      ))}
    </div>
  );
};
