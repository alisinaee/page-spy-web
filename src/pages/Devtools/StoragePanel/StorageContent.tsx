import { StorageTable } from '@/components/StorageTable';
import { StorageType } from '@/store/platform-config';
import { useSocketMessageStore } from '@/store/socket-message';
import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { SpyStorage } from '@huolala-tech/page-spy-types';

interface Props {
  activeTab: StorageType;
  selected: SpyStorage.Data | null;
  onSelect: (row: SpyStorage.Data) => void;
}

export const StorageContent = memo(
  ({ activeTab, selected, onSelect }: Props) => {
    const storageMsg = useSocketMessageStore(
      useShallow((state) => state.storageMsg),
    );

    return (
      <StorageTable
        activeTab={activeTab}
        storageMsg={storageMsg}
        selected={selected}
        onSelect={onSelect}
      />
    );
  },
);
