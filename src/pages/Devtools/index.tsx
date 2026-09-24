import {
  Button,
  Col,
  Divider,
  Layout,
  Menu,
  message,
  Popconfirm,
  Row,
  Space,
  Skeleton,
  Tooltip,
  Typography,
} from 'antd';
import {
  ClearOutlined,
  CopyOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import copy from 'copy-to-clipboard';
import React, { memo, useEffect, useMemo, useState } from 'react';
import ConsolePanel from './ConsolePanel';
import NetworkPanel from './NetworkPanel';
import SystemPanel from './SystemPanel';
import { useNavigate, useLocation } from 'react-router-dom';
import PagePanel from './PagePanel';
import clsx from 'clsx';
import './index.less';
import { StoragePanel } from './StoragePanel';
import useSearch from '@/utils/useSearch';
import { useEventListener } from '@/utils/useEventListener';
import { useTranslation } from 'react-i18next';
import { ConnectStatus } from './ConnectStatus';
import { useSocketMessageStore } from '@/store/socket-message';
import '@huolala-tech/react-json-view/dist/style.css';
import { throttle } from 'lodash-es';
import { CUSTOM_EVENT } from '@/store/socket-message/socket';
import { SpyClient } from '@huolala-tech/page-spy-types';
import MPWarning from '@/components/MPWarning';
import {
  isBrowser,
  isHarmonyApp,
  isMiniProgram,
} from '@/store/platform-config';
import { useShallow } from 'zustand/react/shallow';
import {
  downloadDeviceSession,
  serializeDeviceSession,
  suggestDeviceLogName,
} from '@/utils/device-session';
import { confirmLogFileName } from './save-log-dialog';
const { Sider, Content } = Layout;
const { Title } = Typography;

type MenuType = 'Console' | 'Network' | 'Page' | 'Storage' | 'System';

const MENU_COMPONENTS: Record<
  MenuType,
  {
    component: React.FC;
    visible?: (params: {
      browser: SpyClient.Browser;
      os: SpyClient.OS;
    }) => boolean;
  }
> = {
  Console: {
    component: ConsolePanel,
  },
  Network: {
    component: NetworkPanel,
  },
  Page: {
    component: PagePanel,
    visible: ({ browser }) => {
      return isBrowser(browser);
    },
  },
  Storage: {
    component: StoragePanel,
  },
  System: {
    component: SystemPanel,
    visible: ({ browser }) => {
      return (
        isBrowser(browser) || isHarmonyApp(browser) || isMiniProgram(browser)
      );
    },
  },
};

interface BadgeMenuProps {
  active: MenuType;
}
const BadgeMenu = memo(({ active }: BadgeMenuProps) => {
  const { t } = useTranslation('translation', { keyPrefix: 'devtool' });
  const navigate = useNavigate();
  const { search } = useLocation();
  const [badge, setBadge] = useState<Record<MenuType, boolean>>({
    Console: false,
    Network: false,
    Page: false,
    Storage: false,
    System: false,
  });
  useEventListener(
    CUSTOM_EVENT.NewMessageComing,
    throttle((evt) => {
      const { detail } = evt as CustomEvent;
      const type = `${(detail as string)[0].toUpperCase()}${detail.slice(
        1,
      )}` as MenuType;
      if (type !== active) {
        setBadge((prev) => ({
          ...prev,
          [type]: true,
        }));
      }
    }, 100),
  );

  useEffect(() => {
    setBadge((prev) => ({
      ...prev,
      [active]: false,
    }));
  }, [active]);

  const clientInfo = useSocketMessageStore(
    useShallow((state) => state.clientInfo),
  );

  const menuItems = useMemo(() => {
    if (!clientInfo) return;
    return Object.entries(MENU_COMPONENTS)
      .filter(([key, item]) => {
        // Menu filter by some conditions``
        return (
          !item.visible ||
          item.visible({
            browser: clientInfo.browser.type,
            os: clientInfo.os.type,
          })
        );
      })
      .map(([key, item]) => {
        return {
          key,
          label: (
            <div
              className="sider-menu__item"
              onClick={() => {
                navigate({ search, hash: key });
              }}
            >
              <span>{t(`menu.${key}`)}</span>
              <div
                className={clsx('circle-badge', {
                  show: badge[key as MenuType],
                })}
              />
            </div>
          ),
        };
      });
  }, [clientInfo, badge, navigate, search, t]);

  if (!clientInfo) {
    return Object.keys(MENU_COMPONENTS).map((_, index) => {
      return (
        <Skeleton.Button
          key={index}
          active
          style={{ display: 'block', width: '90%', margin: '12px auto 0' }}
        />
      );
    });
  }

  return (
    <Menu
      className="sider-menu"
      mode="inline"
      selectedKeys={[active]}
      items={menuItems}
    />
  );
});

const ClientInfo = memo(() => {
  const { t } = useTranslation('translation', { keyPrefix: 'devtool' });
  const { address = '' } = useSearch();
  const clientInfo = useSocketMessageStore(
    useShallow((state) => state.clientInfo),
  );
  const socket = useSocketMessageStore((state) => state.socket);
  const clearDeviceSession = useSocketMessageStore(
    (state) => state.clearDeviceSession,
  );

  const copyAllLogs = () => {
    try {
      const copied = copy(serializeDeviceSession(address));
      if (copied) {
        message.success(t('copy-all-success'));
      } else {
        message.error(t('copy-all-error'));
      }
    } catch (error) {
      console.error('Failed to copy device session', error);
      message.error(t('copy-all-error'));
    }
  };

  const downloadAllLogs = async () => {
    try {
      const fileName = await confirmLogFileName(
        suggestDeviceLogName(address, 'all'),
      );
      if (!fileName) return;
      downloadDeviceSession(address, fileName);
      message.success(t('download-success'));
    } catch (error) {
      console.error('Failed to download device session', error);
      message.error(t('export-error'));
    }
  };

  const clearPanelLogs = () => {
    clearDeviceSession();
    socket?.unicastMessage({
      type: 'debug',
      data: 'console.clear()',
    });
    message.success(t('clear-success'));
  };

  return (
    <div className="client-info">
      <Title level={4} style={{ marginBlock: 12 }}>
        {t('device')}
      </Title>
      <Row wrap={false} align="middle" style={{ textAlign: 'center' }}>
        <Tooltip
          title={
            <>
              <span>
                {t('system')}: {clientInfo?.os.name}
              </span>
              <br />
              <span>
                {t('version')}: {clientInfo?.os.version}
              </span>
            </>
          }
        >
          <Col span={11}>
            <img className="client-info__logo" src={clientInfo?.os.logo} />
          </Col>
        </Tooltip>
        <Divider type="vertical" />
        <Tooltip
          title={
            <>
              <span>
                {t('platform')}: {clientInfo?.browser.name}
              </span>
              <br />
              <span>
                {t('version')}: {clientInfo?.browser.version}
              </span>
            </>
          }
        >
          <Col span={11}>
            <img className="client-info__logo" src={clientInfo?.browser.logo} />
          </Col>
        </Tooltip>
      </Row>
      <Divider type="horizontal" style={{ margin: '8px 0' }} />
      <Tooltip title="Device ID">
        <Row justify="center" className="page-spy-id">
          <Col>
            <b>{address.slice(0, 4)}</b>
          </Col>
        </Row>
      </Tooltip>
      <Space className="client-info__actions" direction="vertical" size={8}>
        <Button size="small" icon={<CopyOutlined />} onClick={copyAllLogs}>
          {t('copy-all')}
        </Button>
        <Button
          size="small"
          icon={<DownloadOutlined />}
          onClick={downloadAllLogs}
        >
          {t('download')}
        </Button>
        <Popconfirm
          title={t('clear-confirm-title')}
          description={t('clear-confirm-description')}
          okText="Clear"
          cancelText="Cancel"
          onConfirm={clearPanelLogs}
        >
          <Button danger size="small" icon={<ClearOutlined />}>
            {t('clear-panel-logs')}
          </Button>
        </Popconfirm>
      </Space>
    </div>
  );
});

export default function Devtools() {
  const { hash = '#Console' } = useLocation();
  const { address = '', secret = '' } = useSearch();
  const [socket, initSocket, clientInfo] = useSocketMessageStore(
    useShallow((state) => [state.socket, state.initSocket, state.clientInfo]),
  );

  useEffect(() => {
    if (socket) return;
    initSocket({ address, secret });
  }, [address, initSocket, secret, socket]);

  const hashKey = useMemo<MenuType>(() => {
    const value = hash.slice(1);
    if (!(value in MENU_COMPONENTS)) {
      return 'Console';
    }
    return value as MenuType;
  }, [hash]);

  const ActiveContent = useMemo(() => {
    const content = MENU_COMPONENTS[hashKey];
    return content.component || ConsolePanel;
  }, [hashKey]);

  if (!address) {
    message.error('Error url params!');
    return null;
  }

  // eslint-disable-next-line consistent-return
  return (
    <Layout className="page-spy-devtools">
      <Sider theme="light">
        <div className="page-spy-devtools__sider">
          <ClientInfo />
          {clientInfo?.plugins?.includes('MPEvalPlugin') && (
            <MPWarning className="sider-warning" />
          )}
          <BadgeMenu active={hashKey} />
        </div>
      </Sider>
      <Content className="page-spy-devtools__content">
        <ConnectStatus />
        <div className="page-spy-devtools__panel">
          <ActiveContent />
        </div>
      </Content>
    </Layout>
  );
}
