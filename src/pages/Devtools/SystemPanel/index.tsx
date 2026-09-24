import { memo } from 'react';
import { Button, Col, Empty, Row, Tooltip } from 'antd';
import { Space } from 'antd';
import { SectionLogActions } from '../SectionLogActions';
import { useSocketMessageStore } from '@/store/socket-message';
import SystemContent from '@/components/SystemContent';
import { ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

const SystemPanel = memo(() => {
  const [systemMsg, refresh] = useSocketMessageStore(
    useShallow((state) => [state.systemMsg, state.refresh]),
  );

  const { t } = useTranslation();

  return (
    <div className="system-panel">
      <Row justify="end">
        <Col>
          <Space>
            <SectionLogActions section="system" />
            <Tooltip title={t('common.refresh')}>
              <Button
                onClick={() => {
                  refresh('system');
                }}
              >
                <ReloadOutlined />
              </Button>
            </Tooltip>
          </Space>
        </Col>
      </Row>
      {systemMsg.length === 0 ? (
        <Empty description={false} />
      ) : (
        <SystemContent data={systemMsg} />
      )}
    </div>
  );
});

export default SystemPanel;
