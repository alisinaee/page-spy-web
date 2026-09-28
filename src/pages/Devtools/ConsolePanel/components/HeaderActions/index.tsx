import { useSocketMessageStore } from '@/store/socket-message';
import { Row, Col, Input, Select, Space } from 'antd';
import React, { useCallback } from 'react';
import { SpyConsole } from '@huolala-tech/page-spy-types';
import ErrorSvg from '@/assets/image/error.svg?react';
import InfoSvg from '@/assets/image/info.svg?react';
import WarnSvg from '@/assets/image/warn.svg?react';
import UserSvg from '@/assets/image/user.svg?react';
import DebugSvg from '@/assets/image/debug.svg?react';
import './index.less';
import { debounce } from 'lodash-es';
import { useShallow } from 'zustand/react/shallow';
import { SectionLogActions } from '@/pages/Devtools/SectionLogActions';

export const HeaderActions = () => {
  const [changeConsoleMsgFilter, setConsoleMsgKeywordFilter] =
    useSocketMessageStore(
      useShallow((state) => [
        state.setConsoleMsgTypeFilter,
        state.setConsoleMsgKeywordFilter,
      ]),
    );

  const logLevelList: Array<{
    label: string | React.ReactNode;
    value: SpyConsole.ProxyType;
  }> = [
    {
      label: (
        <div className="select-item">
          <UserSvg style={{ height: 15, width: 15 }} />
          <span className="select-item label-text">User messages</span>
        </div>
      ),
      value: 'log',
    },
    {
      label: (
        <div className="select-item">
          <ErrorSvg style={{ height: 15, width: 15 }} />
          <span className="select-item label-text">Errors</span>
        </div>
      ),
      value: 'error',
    },
    {
      label: (
        <div className="select-item">
          <WarnSvg style={{ height: 15, width: 15 }} />
          <span className="select-item label-text">Warnings</span>
        </div>
      ),
      value: 'warn',
    },
    {
      label: (
        <div className="select-item">
          <InfoSvg style={{ height: 15, width: 15 }} />
          <span className="select-item label-text">Info</span>
        </div>
      ),
      value: 'info',
    },
    {
      label: (
        <div className="select-item">
          <DebugSvg style={{ height: 15, width: 15 }} />
          <span className="select-item label-text">Verbose</span>
        </div>
      ),
      value: 'debug',
    },
  ];

  const debounceKeywordFilter = useCallback(
    debounce((e) => {
      setConsoleMsgKeywordFilter(e.target.value);
    }, 300),
    [],
  );

  return (
    <Row justify="end" className="console-header-actions">
      <Col xs={24} sm={24} md="auto" style={{ width: '100%' }}>
        <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Select
            onChange={changeConsoleMsgFilter}
            maxTagCount="responsive"
            mode="multiple"
            allowClear={true}
            options={logLevelList}
            placeholder="Log Level Filter"
            className="console-filter-select"
          />
          <Input
            onChange={debounceKeywordFilter}
            placeholder="Keyword Filter"
            allowClear={true}
            className="console-filter-input"
          />
          <SectionLogActions section="console" />
        </Space>
      </Col>
    </Row>
  );
};
