import { ConfigProvider } from 'antd';
import React from 'react';
import { HashRouter } from 'react-router-dom';
import RouteConfig from './routes/config';
import en from 'antd/es/locale/en_US';
import { ErrorBoundary } from './components/ErrorBoundary';
import dayjs from 'dayjs';
import { CNUserModal } from './components/CNUserModal';
import { DocSearch } from './components/DocSearch';
import { DropFile } from './components/DropFile';
import { AuthProvider } from './utils/AuthContext';

dayjs.locale(en.locale);

export const App = () => {
  return (
    <React.StrictMode>
      <HashRouter>
        <ErrorBoundary>
          <ConfigProvider
            locale={en}
            theme={{
              token: {
                colorLink: 'rgb(132, 52, 233)',
                colorPrimary: 'rgb(132, 52, 233)',
                colorPrimaryBg: 'rgb(247, 241, 255)',
              },
            }}
          >
            <AuthProvider>
              <CNUserModal />
              <RouteConfig />
              <DocSearch />
              <DropFile />
            </AuthProvider>
          </ConfigProvider>
        </ErrorBoundary>
      </HashRouter>
    </React.StrictMode>
  );
};
