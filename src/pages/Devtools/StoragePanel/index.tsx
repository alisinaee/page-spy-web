import type { SpyStorage } from '@huolala-tech/page-spy-types';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SectionLogActions } from '../SectionLogActions';
import { useEffect, useState } from 'react';
import './index.less';
import { useSocketMessageStore } from '@/store/socket-message';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StorageType, useStorageTypes } from '@/store/platform-config';
import { DBTable } from '@/components/DBTable';
import { StorageContent } from './StorageContent';
import { ResizableDetail } from '@/components/ResizableDetail';
import { useShallow } from 'zustand/react/shallow';
import clsx from 'clsx';

export const StoragePanel = () => {
  const { t } = useTranslation();
  const refresh = useSocketMessageStore(useShallow((state) => state.refresh));

  const storageTypes = useStorageTypes();

  const [activeTab, setActiveTab] = useState<StorageType | 'indexedDB'>(() => {
    if (storageTypes.length > 0) {
      return storageTypes[0].name;
    }
    return 'localStorage';
  });

  useEffect(() => {
    if (
      storageTypes.length > 0 &&
      !storageTypes.some((t) => t.name === activeTab)
    ) {
      setActiveTab(storageTypes[0].name);
    }
  }, [storageTypes, activeTab]);

  return (
    <div className="storage-panel flex flex-col h-full">
      <div className="flex justify-end p-2 border-b border-border">
        <div className="flex items-center gap-2">
          <SectionLogActions section="storage" />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-touch"
                  variant="outline"
                  onClick={() => {
                    refresh(activeTab);
                  }}
                  aria-label={t('common.refresh')!}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              }
            />
            <TooltipContent>{t('common.refresh')}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="storage-panel__layout flex flex-1 overflow-hidden">
        <div className="storage-panel__sider w-44 shrink-0 border-r border-border p-2 space-y-1 overflow-y-auto">
          {storageTypes.map((st) => {
            const IconComp = st.icon;
            return (
              <button
                key={st.name}
                type="button"
                className={clsx(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-left transition-colors cursor-pointer',
                  activeTab === st.name
                    ? 'bg-secondary text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
                )}
                onClick={() => setActiveTab(st.name)}
              >
                {IconComp && <IconComp style={{ width: 16, height: 16 }} />}
                <span className="truncate">{st.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="storage-panel__content flex-1 overflow-auto">
            {activeTab === 'indexedDB' ? (
              <DBTable />
            ) : (
              <StorageContent activeTab={activeTab} />
            )}
          </div>
          {activeTab !== 'indexedDB' && <ResizableDetail />}
        </div>
      </div>
    </div>
  );
};
