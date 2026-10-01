import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import { useSocketMessageStore } from '@/store/socket-message';
import { NetworkTable } from '@/components/NetworkTable';
import {
  RESOURCE_TYPE,
  TypeFilter,
  type NetworkType,
} from '@/components/NetworkTable/TypeFilter';
import { PanelToolbar, SearchField } from '@/components/panel';
import { SectionLogActions } from '../SectionLogActions';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NetworkPanel = memo(() => {
  const { t } = useTranslation();

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
    <div className="network-panel flex h-full min-h-0 flex-col">
      <PanelToolbar
        actions={<SectionLogActions section="network" />}
        menu={
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Filters"
              className="inline-flex size-11 items-center justify-center rounded-lg border border-border text-foreground"
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem
                className="min-h-11"
                onClick={() => setNetworkType('All')}
              >
                Select all
              </DropdownMenuItem>
              {[...RESOURCE_TYPE.keys()].map((key) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  className="min-h-11"
                  checked={networkType === key}
                  onCheckedChange={() => setNetworkType(key as NetworkType)}
                >
                  {key}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
        search={
          <SearchField
            value={networkKeyword}
            onChange={setNetworkKeyword}
            label={t('network.filter-url', { defaultValue: 'Filter by URL' })}
          />
        }
      >
        <TypeFilter value={networkType} onChange={setNetworkType} />
      </PanelToolbar>
      <NetworkTable
        data={networkMsg}
        filterKeyword={networkKeyword}
        filterType={networkType}
        cookie={storageMsg.cookie}
      />
    </div>
  );
});

export default NetworkPanel;
