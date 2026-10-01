import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import OnlineSvg from '@/assets/image/online.svg?react';
import { useState } from 'react';
import clsx from 'clsx';
import './index.less';
import { createPortal } from 'react-dom';
import { Separator } from '@/components/ui/separator';

export const NavMenuOnPc = () => {
  const { t } = useTranslation();

  return (
    <div className="nav-menu pc flex items-center gap-3">
      <Link
        to="/room-list"
        className="menu-item online flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <OnlineSvg className="size-4.5" />
        <span>{t('common.connections')}</span>
      </Link>
    </div>
  );
};

export const NavMenuOnMobile = () => {
  const { t } = useTranslation();
  const [expand, setExpand] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isDevtools = location.pathname.includes('/devtools');

  return (
    <>
      <div className="nav-menu mobile">
        <button
          className={clsx('menu-hamburger', {
            'is-expanded': expand,
          })}
          onClick={() => {
            setExpand(!expand);
          }}
          aria-label="Toggle navigation menu"
        >
          <div className="hamburger-box">
            <div className="hamburger-item top" />
            <div className="hamburger-item middle" />
            <div className="hamburger-item bottom" />
          </div>
        </button>
      </div>
      {expand &&
        createPortal(
          <div className="fixed-menu">
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
                <Separator className="my-2 bg-border/40" />
              </>
            )}
            <Link
              to="room-list"
              className="menu-item online flex items-center gap-2"
              onClick={() => {
                setExpand(false);
              }}
            >
              <OnlineSvg className="size-4.5" />
              <span>{t('common.connections')}</span>
            </Link>
          </div>,
          document.querySelector('header') || document.body,
        )}
    </>
  );
};
