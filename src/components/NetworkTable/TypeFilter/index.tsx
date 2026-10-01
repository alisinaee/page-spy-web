import { SpyNetwork } from '@huolala-tech/page-spy-types';
import { FilterChip } from '@/components/panel';

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
  value?: NetworkType;
  onChange: (type: NetworkType) => void;
}

export const TypeFilter = ({ value = 'All', onChange }: Props) => (
  <>
    {[...RESOURCE_TYPE.keys()].map((key) => (
      <FilterChip
        key={key}
        active={value === key}
        onClick={() => onChange(key)}
      >
        {key}
      </FilterChip>
    ))}
  </>
);
