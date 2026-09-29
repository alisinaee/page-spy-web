import { getSpyRoom } from '@/apis';
import {
  AllBrowserTypes,
  AllMPTypes,
  ClientRoomInfo,
  OS_CONFIG,
  getBrowserLogo,
  getBrowserName,
  parseUserAgent,
} from '@/utils/brand';
import { useRequest } from 'ahooks';
import {
  Typography,
  Row,
  Col,
  message,
  Empty,
  Button,
  Input,
  Form,
  Select,
  Space,
  Layout,
  Drawer,
  Badge,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './index.less';
import {
  ClearOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { RoomCard } from './RoomCard';
import { Statistics } from './Statistics';
import { LoadingFallback } from '@/components/LoadingFallback';
import { debug } from '@/utils/debug';

const { Title } = Typography;
const { Option } = Select;
const { Sider, Content } = Layout;

const MAXIMUM_CONNECTIONS = 30;

const sortConnections = (data: ClientRoomInfo[]) => {
  const [valid, invalid] = (data || []).reduce(
    (acc, cur) => {
      const hasClient =
        cur.connections.findIndex((i) => i.userId === 'Client') > -1;
      if (hasClient) acc[0].push(cur);
      else acc[1].push(cur);
      return acc;
    },
    [[], []] as I.SpyRoom[][],
  );

  // 有效房间再按创建时间升序
  const ascWithCreatedAtForInvalid = valid.sort((a, b) => {
    if (a.createdAt < b.createdAt) {
      return -1;
    }
    return 1;
  });
  // 失效房间再按活动时间降序
  const ascWithActiveAtForInvalid = invalid.sort((a, b) => {
    if (a.activeAt > b.activeAt) {
      return -1;
    }
    return 1;
  });

  return [...ascWithCreatedAtForInvalid, ...ascWithActiveAtForInvalid];
};

const filterConnections = (
  data: ClientRoomInfo[],
  condition: Record<'title' | 'address' | 'os' | 'browser', string>,
) => {
  const { title = '', address = '', os = '', browser = '' } = condition;
  const lowerCaseTitle = String(title).trim().toLowerCase();
  return data
    .filter(({ tags }) => {
      return String(tags.title).toLowerCase().includes(lowerCaseTitle);
    })
    .filter((i) => {
      const query = String(address || '')
        .trim()
        .toLowerCase();
      if (!query) return true;
      return String(i.address || '')
        .toLowerCase()
        .includes(query);
    })
    .filter((clientInfo) => {
      return (
        (!os || clientInfo.os.type === os) &&
        (!browser || clientInfo.browser.type.includes(browser))
      );
    });
};

const RoomList = () => {
  const [form] = Form.useForm();
  const [mobileForm] = Form.useForm();
  const { t } = useTranslation();

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [showMaximumAlert, setMaximumAlert] = useState(false);
  const showLoadingRef = useRef(false);
  const {
    loading,
    data: connectionList = [],
    error,
    runAsync: requestConnections,
  } = useRequest(
    async (group = '') => {
      const res = await getSpyRoom(group);
      return res.data?.map((conn) => {
        const { os, browser } = parseUserAgent(conn.name);
        return {
          ...conn,
          os,
          browser,
        };
      });
    },
    {
      pollingInterval: 5000,
      pollingWhenHidden: false,
      pollingErrorRetryCount: 0,
      onError(e) {
        message.error(e.message);
      },
      onFinally() {
        showLoadingRef.current = true;
      },
    },
  );

  const BrowserOptions = useMemo(() => {
    return AllBrowserTypes.filter((browser) => {
      return connectionList?.some(
        (conn) => conn.browser.type.toLocaleLowerCase() === browser,
      );
    }).map((name) => {
      return {
        name,
        label: getBrowserName(name),
        logo: getBrowserLogo(name),
      };
    });
  }, [connectionList]);

  const MPTypeOptions = useMemo(() => {
    return AllMPTypes.filter((mp) => {
      return connectionList?.some((conn) => conn.browser.type === mp);
    }).map((name) => {
      return {
        name,
        label: getBrowserName(name),
        logo: getBrowserLogo(name),
      };
    });
  }, [connectionList]);

  const [conditions, setConditions] = useState({
    title: '',
    address: '',
    project: '',
    os: '',
    browser: '',
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (conditions.title) count++;
    if (conditions.address) count++;
    if (conditions.project) count++;
    if (conditions.os) count++;
    if (conditions.browser) count++;
    return count;
  }, [conditions]);
  const hasActiveFilters = activeFilterCount > 0;

  const onFormFinish = useCallback(
    async (value: any) => {
      try {
        await requestConnections(value.project);
        setConditions((state) => ({
          ...state,
          ...value,
        }));
      } catch (e: any) {
        message.error(e.message);
      }
    },
    [requestConnections],
  );

  const mainContent = useMemo(() => {
    if (loading && !showLoadingRef.current) {
      return <LoadingFallback />;
    }
    const matchedConnections = filterConnections(connectionList, conditions);
    if (error || matchedConnections.length === 0) {
      return (
        <Empty
          style={{
            marginTop: 60,
          }}
        />
      );
    }
    const list = sortConnections(
      matchedConnections.slice(0, MAXIMUM_CONNECTIONS),
    );

    return (
      <Row
        gutter={[16, 16]}
        style={{ padding: '24px 16px', margin: 0, width: '100%' }}
      >
        {list.map((room) => (
          <RoomCard key={room.address} room={room} />
        ))}
      </Row>
    );
  }, [conditions, connectionList, error, loading]);

  useEffect(() => {
    const matchedConnections = filterConnections(connectionList, conditions);
    setMaximumAlert(matchedConnections.length > MAXIMUM_CONNECTIONS);
  }, [connectionList, conditions]);

  return (
    <Layout style={{ height: '100%' }} className="room-list">
      <Sider width={350} theme="light" className="room-list-desktop-sider">
        <div className="room-list-sider">
          <Title level={3} style={{ marginBottom: 32 }}>
            {t('common.connections')}
          </Title>
          <Form layout="vertical" form={form} onFinish={onFormFinish}>
            <Form.Item label={t('common.device-id')} name="address">
              <Input placeholder={t('common.device-id')!} allowClear />
            </Form.Item>
            <Form.Item label={t('common.project')} name="project">
              <Input placeholder={t('common.project')!} allowClear />
            </Form.Item>
            <Form.Item label={t('common.title')} name="title">
              <Input placeholder={t('common.title')!} allowClear />
            </Form.Item>
            <Form.Item label={t('common.os')} name="os">
              <Select placeholder={t('connections.select-os')} allowClear>
                {Object.entries(OS_CONFIG).map(([name, conf]) => {
                  return (
                    <Option value={name} key={name}>
                      <div className="flex-between">
                        <span>{conf.label}</span>
                        <img src={conf.logo} height="20" alt="" />
                      </div>
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
            <Form.Item label={t('devtool.platform')} name="browser">
              <Select
                listHeight={500}
                placeholder={t('connections.select-browser')}
                allowClear
              >
                {!!BrowserOptions.length && (
                  <Select.OptGroup label="Web" key="web">
                    {BrowserOptions.map(({ name, logo, label }) => {
                      return (
                        <Option key={name} value={name}>
                          <div className="flex-between">
                            <span>{label}</span>
                            <img src={logo} width="20" height="20" alt="" />
                          </div>
                        </Option>
                      );
                    })}
                  </Select.OptGroup>
                )}

                {!!MPTypeOptions.length && (
                  <Select.OptGroup
                    label={t('common.miniprogram')}
                    key="miniprogram"
                  >
                    {MPTypeOptions.map(({ name, logo, label }) => {
                      return (
                        <Option key={name} value={name}>
                          <div className="flex-between">
                            <span>{label}</span>
                            <img src={logo} width="20" height="20" alt="" />
                          </div>
                        </Option>
                      );
                    })}
                  </Select.OptGroup>
                )}
              </Select>
            </Form.Item>
            <Row justify="end">
              <Col>
                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SearchOutlined />}
                    >
                      {t('common.search')}
                    </Button>
                    <Button
                      type="default"
                      icon={<ClearOutlined />}
                      onClick={() => {
                        form.resetFields();
                        form.submit();
                      }}
                    >
                      {t('common.reset')}
                    </Button>
                  </Space>
                </Form.Item>
              </Col>
            </Row>

            {showMaximumAlert && (
              <div className="maximum-alert">
                {t('connections.maximum-alert')}
              </div>
            )}
          </Form>
          {debug.enabled && <Statistics data={connectionList} />}
        </div>
      </Sider>
      <Content className="room-list-content">
        <div className="room-list-mobile-header">
          <div className="room-list-mobile-header__title">
            <Title level={4} style={{ margin: 0 }}>
              {t('common.connections')}
            </Title>
            <Badge
              count={filterConnections(connectionList, conditions).length}
              overflowCount={999}
              style={{ backgroundColor: '#7c3aed' }}
            />
          </div>
          <Button
            icon={<FilterOutlined />}
            type={hasActiveFilters ? 'primary' : 'default'}
            onClick={() => {
              mobileForm.setFieldsValue(form.getFieldsValue());
              setMobileFilterOpen(true);
            }}
          >
            {hasActiveFilters ? 'Filter (' + activeFilterCount + ')' : 'Filter'}
          </Button>
        </div>

        <div className="room-list-cards-wrapper">{mainContent}</div>

        <Drawer
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FilterOutlined style={{ color: '#7c3aed' }} />
              <span>Filter Connections</span>
            </div>
          }
          placement="right"
          width="85%"
          open={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          className="room-list-filter-drawer"
        >
          <Form
            layout="vertical"
            form={mobileForm}
            onFinish={async (val) => {
              await onFormFinish(val);
              form.setFieldsValue(val);
              setMobileFilterOpen(false);
            }}
          >
            <Form.Item label={t('common.device-id')} name="address">
              <Input placeholder={t('common.device-id')!} allowClear />
            </Form.Item>
            <Form.Item label={t('common.project')} name="project">
              <Input placeholder={t('common.project')!} allowClear />
            </Form.Item>
            <Form.Item label={t('common.title')} name="title">
              <Input placeholder={t('common.title')!} allowClear />
            </Form.Item>
            <Form.Item label={t('common.os')} name="os">
              <Select placeholder={t('connections.select-os')} allowClear>
                {Object.entries(OS_CONFIG).map(([name, conf]) => (
                  <Option value={name} key={name}>
                    <div className="flex-between">
                      <span>{conf.label}</span>
                      <img src={conf.logo} height="20" alt="" />
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label={t('devtool.platform')} name="browser">
              <Select
                listHeight={500}
                placeholder={t('connections.select-browser')}
                allowClear
              >
                {!!BrowserOptions.length && (
                  <Select.OptGroup label="Web" key="web">
                    {BrowserOptions.map(({ name, logo, label }) => (
                      <Option key={name} value={name}>
                        <div className="flex-between">
                          <span>{label}</span>
                          <img src={logo} width="20" height="20" alt="" />
                        </div>
                      </Option>
                    ))}
                  </Select.OptGroup>
                )}

                {!!MPTypeOptions.length && (
                  <Select.OptGroup
                    label={t('common.miniprogram')}
                    key="miniprogram"
                  >
                    {MPTypeOptions.map(({ name, logo, label }) => (
                      <Option key={name} value={name}>
                        <div className="flex-between">
                          <span>{label}</span>
                          <img src={logo} width="20" height="20" alt="" />
                        </div>
                      </Option>
                    ))}
                  </Select.OptGroup>
                )}
              </Select>
            </Form.Item>
            <Row justify="end">
              <Col span={24}>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Space
                    style={{
                      width: '100%',
                      justifyContent: 'space-between',
                      display: 'flex',
                    }}
                  >
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SearchOutlined />}
                      style={{ flex: 1 }}
                    >
                      {t('common.search')}
                    </Button>
                    <Button
                      type="default"
                      icon={<ClearOutlined />}
                      style={{ flex: 1 }}
                      onClick={() => {
                        mobileForm.resetFields();
                        form.resetFields();
                        mobileForm.submit();
                        setMobileFilterOpen(false);
                      }}
                    >
                      {t('common.reset')}
                    </Button>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Drawer>
      </Content>
    </Layout>
  );
};

export default RoomList;
