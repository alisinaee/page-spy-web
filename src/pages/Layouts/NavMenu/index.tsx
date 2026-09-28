import { isClient } from '@/utils/constants';
import Icon from '@ant-design/icons';
import { Divider, Dropdown, ConfigProvider, Flex } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import DocsSvg from '@/assets/image/docs.svg?react';
import BugSvg from '@/assets/image/bug.svg?react';
import OnlineSvg from '@/assets/image/online.svg?react';
import ReplaySvg from '@/assets/image/replay.svg?react';
import { useRef, useState } from 'react';
import clsx from 'clsx';
import './index.less';
import { CSSTransition } from 'react-transition-group';
import { createPortal } from 'react-dom';
import { useWhere } from '@/utils/useWhere';
import { OpenDocSearch } from '@/components/DocSearch/OpenDocSearch';

const githubRepo = import.meta.env.VITE_GITHUB_REPO.replace(
  /^https?:\/\/github\.com\//,
  '',
).replace(/\/$/, '');
const githubStarsUrl = `https://img.shields.io/github/stars/${githubRepo}?style=social`;

const navDropdownConfig = {
  components: {
    Dropdown: {
      colorBgElevated: '#313131',
      colorText: '#eee',
    },
  },
};

export const NavMenuOnPc = () => {
  const { isOSpy } = useWhere();
  const { t } = useTranslation();

  return (
    <div className="nav-menu pc">
      {/* Docs */}
      <Link to="docs" className="menu-item doc">
        <Flex align="center" gap={8}>
          <Icon component={DocsSvg} style={{ fontSize: 18 }} />
          <span>{t('common.doc')}</span>
        </Flex>
      </Link>
      <Divider type="vertical" className="divider-bg" />
      {isClient && !isOSpy && (
        <>
          <div className="menu-item debug-type">
            <ConfigProvider theme={navDropdownConfig}>
              <Dropdown
                arrow
                trigger={['click']}
                menu={{
                  items: [
                    {
                      key: 'online-debug',
                      label: (
                        <Link to="/room-list" className="menu-item online">
                          <Flex align="center" gap={8}>
                            <Icon
                              component={OnlineSvg}
                              style={{ fontSize: 18 }}
                            />
                            <span>{t('common.online-debug')}</span>
                          </Flex>
                        </Link>
                      ),
                    },
                    {
                      key: 'offline-debug',
                      label: (
                        <Link to="/log-list" className="menu-item offline">
                          <Flex align="center" gap={8}>
                            <Icon
                              component={ReplaySvg}
                              style={{ fontSize: 18 }}
                            />
                            <span>{t('common.offline-debug')}</span>
                          </Flex>
                        </Link>
                      ),
                    },
                  ],
                }}
              >
                <Flex align="center" gap={8}>
                  <Icon component={BugSvg} style={{ fontSize: 18 }} />
                  <span>{t('common.start-debug')}</span>
                </Flex>
              </Dropdown>
            </ConfigProvider>
          </div>
          <Divider type="vertical" className="divider-bg" />
        </>
      )}
      <a
        href={import.meta.env.VITE_GITHUB_REPO}
        target="_blank"
        className="menu-item"
        style={{ fontSize: 0 }}
      >
        <img src={githubStarsUrl} alt="" />
      </a>
    </div>
  );
};

export const NavMenuOnMobile = () => {
  const { isOSpy } = useWhere();
  const { t } = useTranslation();
  const [expand, setExpand] = useState(false);
  const fixedMenuRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isDevtools = location.pathname.includes('/devtools');

  return (
    <>
      <div className="nav-menu mobile">
        <OpenDocSearch />
        <button
          className={clsx('menu-hamburger', {
            'is-expanded': expand,
          })}
          onClick={() => {
            setExpand(!expand);
          }}
        >
          <div className="hamburger-box">
            <div className="hamburger-item top" />
            <div className="hamburger-item middle" />
            <div className="hamburger-item bottom" />
          </div>
        </button>
      </div>
      {createPortal(
        <CSSTransition
          nodeRef={fixedMenuRef}
          in={expand}
          timeout={200}
          classNames="fixed-menu-fade"
          mountOnEnter
          unmountOnExit
        >
          <div ref={fixedMenuRef} className="fixed-menu">
            {isDevtools && (
              <>
                <div
                  style={{
                    color: '#aaa',
                    fontSize: 12,
                    padding: '4px 16px',
                    fontWeight: 600,
                  }}
                >
                  Devtools Panels
                </div>
                {['Console', 'Network', 'Page', 'Storage', 'System'].map(
                  (tab) => (
                    <div
                      key={tab}
                      className="menu-item"
                      style={{ padding: '8px 16px', cursor: 'pointer' }}
                      onClick={() => {
                        navigate({ search: location.search, hash: tab });
                        setExpand(false);
                      }}
                    >
                      <span>{tab}</span>
                    </div>
                  ),
                )}
                <Divider
                  style={{
                    margin: '8px 0',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                />
              </>
            )}
            {/* Docs */}
            <Link
              to="docs"
              className="menu-item doc"
              onClick={() => {
                setExpand(false);
              }}
            >
              <Flex align="center" gap={8}>
                <Icon component={DocsSvg} style={{ fontSize: 18 }} />
                <span>{t('common.doc')}</span>
              </Flex>
            </Link>
            {isClient && !isOSpy && (
              <>
                {/* Connections */}
                <Link
                  to="room-list"
                  className="menu-item online"
                  onClick={() => {
                    setExpand(false);
                  }}
                >
                  <Flex align="center" gap={8}>
                    <Icon component={OnlineSvg} style={{ fontSize: 18 }} />
                    <span>{t('common.connections')}</span>
                  </Flex>
                </Link>
              </>
            )}
            {/* GitHub */}
            <div className="menu-item">
              <a href={import.meta.env.VITE_GITHUB_REPO} target="_blank">
                <img src={githubStarsUrl} alt="" />
              </a>
            </div>
          </div>
        </CSSTransition>,
        document.querySelector('header') || document.body,
      )}
    </>
  );
};
