import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Trash2 } from 'lucide-react';
import type { SpyStorage } from '@huolala-tech/page-spy-types';
import { Button } from '@/components/ui/button';
import { useSocketMessageStore } from '@/store/socket-message';
import { StorageType, useStorageTypes } from '@/store/platform-config';
import { DBTable } from '@/components/DBTable';
import { StorageDetail } from '@/components/StorageTable';
import { DetailPane, FilterChip, PanelToolbar } from '@/components/panel';
import { StorageContent } from './StorageContent';
import { useShallow } from 'zustand/react/shallow';

export const StoragePanel = () => {
  const { t } = useTranslation();
  const [refresh, clearRecord] = useSocketMessageStore(
    useShallow((state) => [state.refresh, state.clearRecord]),
  );
  const storageTypes = useStorageTypes();

  const [activeTab, setActiveTab] = useState<StorageType | 'indexedDB'>(() =>
    storageTypes.length > 0 ? storageTypes[0].name : 'localStorage',
  );
  const [selected, setSelected] = useState<SpyStorage.Data | null>(null);

  useEffect(() => {
    if (
      storageTypes.length > 0 &&
      !storageTypes.some((s) => s.name === activeTab)
    ) {
      setActiveTab(storageTypes[0].name);
    }
  }, [storageTypes, activeTab]);

  useEffect(() => setSelected(null), [activeTab]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <PanelToolbar
        actions={
          <>
            <Button
              variant="ghost"
              size="icon-touch"
              aria-label={t('common.refresh')!}
              className="md:size-8 md:min-h-0 md:min-w-0"
              onClick={() => refresh(activeTab)}
            >
              <RefreshCw />
            </Button>
            <Button
              variant="ghost"
              size="icon-touch"
              aria-label={t('common.clear')!}
              className="md:size-8 md:min-h-0 md:min-w-0"
              onClick={() => {
                clearRecord('storage');
                setSelected(null);
              }}
            >
              <Trash2 />
            </Button>
          </>
        }
      >
        {storageTypes.map((st) => {
          const Icon = st.icon;
          return (
            <FilterChip
              key={st.name}
              active={activeTab === st.name}
              onClick={() => setActiveTab(st.name)}
              icon={Icon && <Icon />}
            >
              {st.label}
            </FilterChip>
          );
        })}
      </PanelToolbar>
      {activeTab === 'indexedDB' ? (
        <div className="min-h-0 flex-1">
          <DBTable />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-auto">
            <StorageContent
              activeTab={activeTab}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
          <DetailPane
            open={!!selected}
            onClose={() => setSelected(null)}
            title={selected?.name ?? ''}
          >
            {selected && <StorageDetail row={selected} />}
          </DetailPane>
        </div>
      )}
    </div>
  );
};
