import StorageSvg from '@/assets/image/storage.svg?react';
import CookieSvg from '@/assets/image/cookie.svg?react';
import DatabaseSvg from '@/assets/image/database.svg?react';
import { SpyClient, SpyStorage } from '@huolala-tech/page-spy-types';
import { FunctionComponent } from 'react';
import { useSocketMessageStore } from './socket-message';
import { AllBrowserTypes } from '@/utils/brand';
import { useShallow } from 'zustand/react/shallow';
export type StorageType = SpyStorage.DataType | 'AppStorage';

export const isBrowser = (browser: SpyClient.Browser) => {
  return AllBrowserTypes.includes(browser);
};

export const STORAGE_TYPES: {
  name: StorageType | 'indexedDB';
  label: string;
  icon: FunctionComponent<any>;
  visible: (browser: SpyClient.Browser) => boolean;
}[] = [
  {
    name: 'localStorage',
    label: 'Local Storage',
    icon: StorageSvg,
    visible: isBrowser,
  },
  {
    name: 'sessionStorage',
    label: 'Session Storage',
    icon: StorageSvg,
    visible: isBrowser,
  },
  {
    name: 'cookie',
    label: 'Cookies',
    icon: CookieSvg,
    visible: isBrowser,
  },
  {
    name: 'indexedDB',
    label: 'IndexedDB',
    icon: DatabaseSvg,
    visible: isBrowser,
  },
];

export const useStorageTypes = () => {
  const clientInfo = useSocketMessageStore(
    useShallow((state) => state.clientInfo),
  );
  return STORAGE_TYPES.filter((s) => {
    return s.visible(clientInfo?.browser.type || 'unknown');
  });
};
