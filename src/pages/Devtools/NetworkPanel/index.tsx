/* eslint-disable no-case-declarations */
import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import './index.less';
import { useTranslation } from 'react-i18next';
import { useSocketMessageStore } from '@/store/socket-message';
import { NetworkTable } from '@/components/NetworkTable';
import { ONLINE_NETWORK_CACHE } from '@/components/ResizableTitle/cache-key';
import { TypeFilter } from '@/components/NetworkTable/TypeFilter';
import { SectionLogActions } from '../SectionLogActions';
import { Input } from '@/components/ui/input';

const NetworkPanel = memo(() => {
  const { t: ct } = useTranslation('translation', { keyPrefix: 'common' });

  const [networkKeyword, setNetworkKeyword, networkType, setNetworkType] =
    useSocketMessageStore(
      useShallow((state) => [
        state.networkKeyword,
        state.setNetworkKeyword,
        state.networkType,
        state.setNetworkType,
      ]),
    );

  const [networkMsg, storageMsg] = useSocketMessageStore(
    useShallow((state) => [state.networkMsg, state.storageMsg]),
  );

  return (
    <div className="network-panel flex flex-col h-full">
      <div className="network-header-actions flex flex-wrap items-center justify-end gap-2 p-1.5 border-b border-border/40">
        <div className="w-36 sm:w-48">
          <Input
            value={networkKeyword}
            onChange={(e) => {
              setNetworkKeyword(e.target.value);
            }}
            placeholder={ct('filter')!}
            className="h-7 text-xs"
          />
        </div>
        <TypeFilter
          value={networkType}
          onChange={(type) => {
            setNetworkType(type);
          }}
        />
        <SectionLogActions section="network" />
      </div>
      <div className="network-panel__content flex-1 min-h-0">
        <NetworkTable
          data={networkMsg}
          filterKeyword={networkKeyword}
          filterType={networkType}
          cookie={storageMsg.cookie}
          resizeCacheKey={ONLINE_NETWORK_CACHE}
        />
      </div>
    </div>
  );
});

export default NetworkPanel;
