/* eslint-disable no-case-declarations */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { CUSTOM_EVENT, SocketStore } from './socket';
import {
  SpyConsole,
  SpySystem,
  SpyPage,
  SpyStorage,
  SpyDatabase,
  SpyClient,
} from '@huolala-tech/page-spy-types';
import { API_BASE_URL } from '@/apis/request';
import { ResolvedNetworkInfo, resolveProtocol, resolveUrlInfo } from '@/utils';
import { ElementContent } from 'hast';
import { getFixedPageMsg, processMPNetworkMsg } from './utils';
import { isEqual, omit } from 'lodash-es';
import { parseClientInfo, ParsedClientInfo } from '@/utils/brand';
import { StorageType } from '../platform-config';
import type { RequestItem } from '@huolala-tech/page-spy-base';
import { NetworkType } from '@/components/NetworkTable/TypeFilter';
import { PLACEHOLDER_RESPONSE } from '@/utils/constants';

const USER_ID = 'Debugger';

interface SocketMessage {
  socket: SocketStore | null;
  clientInfo: ParsedClientInfo | null;
  consoleMsg: SpyConsole.DataItem[];
  consoleMsgTypeFilter: string[];
  consoleMsgKeywordFilter: string;
  consoleDisabledTags: string[];
  networkMsg: ResolvedNetworkInfo[];
  networkKeyword: string;
  networkType: NetworkType;
  systemMsg: SpySystem.DataItem[];
  connectMsg: string[];
  pageMsg: {
    html: String;
    tree: ElementContent[] | null;
    location: SpyPage.DataItem['location'] | null;
  };
  storageMsg: Record<StorageType, SpyStorage.GetTypeDataItem['data']>;
  databaseMsg: {
    basicInfo: SpyDatabase.DBInfo[] | null;
    data: SpyDatabase.GetTypeDataItem | null;
  };
  initSocket: (args: Record<string, string>) => void;
  setConsoleMsgTypeFilter: (typeList: string[]) => void;
  setConsoleMsgKeywordFilter: (keyword: string) => void;
  setConsoleDisabledTags: (tags: string[]) => void;
  setNetworkKeyword: (keyword: string) => void;
  setNetworkType: (type: NetworkType) => void;
  clearRecord: (key: string) => void;
  clearDeviceSession: () => void;
  refresh: (key: string) => void;
}

export const useSocketMessageStore = create<SocketMessage>()(
  immer((set, get) => ({
    socket: null,
    clientInfo: null,
    consoleMsg: [],
    consoleMsgTypeFilter: [],
    consoleMsgKeywordFilter: '',
    consoleDisabledTags: [],
    networkMsg: [],
    networkKeyword: '',
    networkType: 'All',
    systemMsg: [],
    connectMsg: [],
    pageMsg: {
      html: '',
      tree: null,
      location: null,
    },
    storageMsg: {
      localStorage: [],
      sessionStorage: [],
      cookie: [],
      mpStorage: [],
      AppStorage: [],
      asyncStorage: [],
    },
    databaseMsg: {
      basicInfo: null,
      data: null,
    },
    initSocket: ({ address, secret }: Record<string, string>) => {
      if (!address) return;
      const roomID = decodeURIComponent(address).split('#')[0] ?? '';
      if (!roomID) return;

      const _socket = get().socket;
      if (_socket) return;

      try {
        const saved = sessionStorage.getItem(`spy-tobank-logs:${roomID}`);
        if (saved) {
          const parsed = JSON.parse(saved) as {
            consoleMsg?: SpyConsole.DataItem[];
            networkMsg?: ResolvedNetworkInfo[];
          };
          set((state) => {
            if (!state.consoleMsg.length && Array.isArray(parsed.consoleMsg)) {
              state.consoleMsg = parsed.consoleMsg;
            }
            if (!state.networkMsg.length && Array.isArray(parsed.networkMsg)) {
              state.networkMsg = parsed.networkMsg;
            }
          });
        }
      } catch (error) {
        /* a bad cache must not block the socket */
      }

      let persistTimer = 0;
      const schedulePersist = () => {
        window.clearTimeout(persistTimer);
        persistTimer = window.setTimeout(() => {
          const state = get();
          try {
            sessionStorage.setItem(
              `spy-tobank-logs:${roomID}`,
              JSON.stringify({
                consoleMsg: state.consoleMsg,
                networkMsg: state.networkMsg,
              }),
            );
          } catch (error) {
            /* quota: the live socket is still the source of new lines */
          }
        }, 400);
      };

      const [, protocol] = resolveProtocol();
      const url = `${protocol}${API_BASE_URL}/api/v1/ws/room/join?address=${roomID}&userId=${USER_ID}&secret=${secret}`;

      const socket = new SocketStore(url);
      set({ socket });
      socket.addListener('client-info', (data: SpyClient.DataItem) => {
        set((state) => {
          state.clientInfo = parseClientInfo(data);
        });
      });
      socket.addListener('console', (data: SpyConsole.DataItem) => {
        set((state) => {
          if (data.id && state.consoleMsg.some((item) => item.id === data.id))
            return;
          state.consoleMsg.push(data);
        });
        schedulePersist();
      });
      socket.addListener('system', (data: SpySystem.DataItem) => {
        set((state) => {
          state.systemMsg.push(data);
        });
      });
      socket.addListener('network', (data: RequestItem) => {
        const { name, pathname, getData } = resolveUrlInfo(data.url);

        const newData: ResolvedNetworkInfo = {
          ...data,
          name,
          pathname,
          getData,
        };
        // 小程序 network 信息需要特别处理。
        // 你可能会担心，会不会有 network msg 先于 clientInfo 发送过来导致被遗漏？
        // 不会的，clientInfo 是在 socket 连接建立之后立马送过来的，之后才会 flush 历史数据。
        const browserType = get().clientInfo?.browser.type || '';
        const sdk = get().clientInfo?.sdk || '';
        // uniapp 和 taro 可能会编译成 h5 或 app， 所以即使不是小程序，只要用了这两个 sdk 也要走这个逻辑
        if (
          browserType.startsWith('mp-') ||
          sdk === 'uniapp' ||
          sdk === 'taro'
        ) {
          processMPNetworkMsg(newData);
        }
        // 整理 xhr 的消息
        const { id } = newData;
        const cache = get().networkMsg;
        const index = cache.findIndex((item) => item.id === id);
        const { requestType, response, status, endTime, lastEventId } = newData;
        if (index !== -1) {
          // eventsource 的 'open / error' 事件都没有 response，'message' 事件可能会带着 response
          // status === 200 是在 SDK 中硬编码的，和 'message' 事件对应
          if (
            (requestType === 'eventsource' || requestType === 'websocket') &&
            status === 200
          ) {
            newData.response = [
              ...cache[index].response,
              {
                id: lastEventId,
                timestamp: endTime,
                data: response,
              },
            ];
          } else if (
            requestType === 'eventsource' ||
            requestType === 'websocket'
          ) {
            newData.response = cache[index].response;
          }

          set((state) => {
            state.networkMsg.splice(index, 1, newData);
          });
        } else {
          const { requestType, response } = newData;
          if (requestType === 'websocket' || requestType === 'eventsource') {
            // websocket 和 eventsource 需要合并 response
            newData.response =
              response && response !== PLACEHOLDER_RESPONSE
                ? [
                    {
                      id: lastEventId,
                      timestamp: endTime,
                      data: response,
                    },
                  ]
                : [];
          }
          set((state) => {
            state.networkMsg = [...state.networkMsg, newData].sort(
              (a, b) => a.startTime - b.startTime,
            );
          });
        }
        schedulePersist();
      });
      socket.addListener('connect', (data: string) => {
        set((state) => {
          state.connectMsg.push(data);
        });
      });
      socket.addListener('page', async (data: SpyPage.DataItem) => {
        const { tree, html } = await getFixedPageMsg(
          data.html,
          data.location.href,
        );
        set((state) => {
          state.pageMsg = {
            // eslint-disable-next-line no-new-wrappers
            html: new String(html),
            tree,
            location: data.location,
          };
        });
      });
      socket.addListener('storage', (data: SpyStorage.DataItem) => {
        const { type, action } = data;
        switch (action) {
          case 'get':
            set((state) => {
              state.storageMsg[type] = data.data;
            });
            break;
          case 'set':
            if (data.name) {
              set((state) => {
                const result = omit(data, 'id', 'type', 'action');
                const cacheData = state.storageMsg[type];

                const index = cacheData.findIndex(
                  (i) => i.name === result.name,
                );
                if (index < 0) {
                  cacheData.push(result);
                  return;
                }
                const skipUpdate = isEqual(cacheData[index], result);
                if (skipUpdate) return;
                cacheData[index] = result;
              });
            }
            break;
          case 'clear':
            set((state) => {
              state.storageMsg[type] = [];
            });
            break;
          case 'remove':
            set((state) => {
              state.storageMsg[type] = state.storageMsg[type].filter(
                (i) => i.name !== data.name,
              );
            });
            break;
          default:
            break;
        }
      });
      socket.addListener('database', (data: SpyDatabase.DataItem) => {
        switch (data.action) {
          case 'get':
            set((state) => {
              state.databaseMsg.data = data;
            });
            break;
          case 'basic':
            set((state) => {
              state.databaseMsg.basicInfo = data.result;
            });
            break;
          case 'update':
            const cache = get().databaseMsg.data;
            if (!cache) return;
            const { database, store } = cache;
            if (
              database?.name === data.database &&
              store?.name === data.store
            ) {
              window.dispatchEvent(
                new CustomEvent(CUSTOM_EVENT.DatabaseStoreUpdated, {
                  detail: {
                    database: data.database,
                    store: data.store,
                  },
                }),
              );
            }
            break;
          case 'clear':
            set((state) => {
              if (!state.databaseMsg.data) return;
              const { database, store } = state.databaseMsg.data;
              if (
                database?.name === data.database &&
                store?.name === data.store
              ) {
                state.databaseMsg.data = null;
              }
            });
            break;
          case 'drop':
            set((state) => {
              const { basicInfo, data: cache } = state.databaseMsg;
              if (basicInfo) {
                state.databaseMsg.basicInfo = basicInfo.filter(
                  (i) => i.name !== data.database,
                );
              }
              if (cache?.database?.name === data.database) {
                state.databaseMsg.data = null;
              }
            });
            break;
        }
      });
    },
    setConsoleMsgTypeFilter: (typeList: string[]) => {
      set({ consoleMsgTypeFilter: typeList });
    },
    setConsoleMsgKeywordFilter(keyword: string) {
      set({ consoleMsgKeywordFilter: keyword });
    },
    setConsoleDisabledTags: (tags: string[]) => {
      set({ consoleDisabledTags: tags });
    },
    setNetworkKeyword(keyword: string) {
      set({ networkKeyword: keyword });
    },
    setNetworkType(type: NetworkType) {
      set({ networkType: type });
    },
    clearRecord: (key: string) => {
      switch (key) {
        case 'console':
          set({ consoleMsg: [] });
          break;
        case 'network':
          set({ networkMsg: [] });
          break;
        case 'page':
          set({
            pageMsg: {
              html: '',
              tree: null,
              location: null,
            },
          });
          break;
        case 'storage':
          set({
            storageMsg: {
              localStorage: [],
              sessionStorage: [],
              cookie: [],
              mpStorage: [],
              AppStorage: [],
              asyncStorage: [],
            },
            databaseMsg: {
              basicInfo: null,
              data: null,
            },
          });
          break;
        case 'system':
          set({ systemMsg: [] });
          break;
        default:
          break;
      }
    },
    clearDeviceSession: () => {
      set((state) => {
        state.consoleMsg = [];
        state.networkMsg = [];
        state.systemMsg = [];
        state.connectMsg = [];
        state.pageMsg = {
          html: '',
          tree: null,
          location: null,
        };
        state.storageMsg = {
          localStorage: [],
          sessionStorage: [],
          cookie: [],
          mpStorage: [],
          AppStorage: [],
          asyncStorage: [],
        };
        state.databaseMsg = {
          basicInfo: null,
          data: null,
        };
      });
      try {
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith('spy-tobank-logs:'))
            sessionStorage.removeItem(key);
        });
      } catch (error) {
        /* ignore */
      }
    },
    refresh: (key: string) => {
      const socket = get().socket;
      if (!socket) return;
      socket.unicastMessage({
        type: 'refresh',
        data: key,
      });
    },
  })),
);
