import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import OnlineSvg from '@/assets/image/online.svg?react';
import { useState } from 'react';
import clsx from 'clsx';
import { createPortal } from 'react-dom';
import { Separator } from '@/components/ui/separator';

export const NavMenuOnPc = () => {
  const { t } = useTranslation();

  return (
    <div className="hidden lg:flex items-center gap-3 text-sm">
      <Link
        to="/room-list"
        className="flex items-center gap-2 px-3 py-2 text-sm leading-snug text-muted-foreground transition-colors hover:text-primary-text"
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
      <div className="inline-flex items-center gap-5 text-sm lg:hidden">
        <button
          className="flex h-14 items-center border-none bg-transparent text-muted-foreground"
          onClick={() => {
            setExpand(!expand);
          }}
          aria-label="Toggle navigation menu"
        >
          <div className="relative size-4">
            <div
              className={clsx(
                'absolute left-0 top-0 h-0.5 origin-left bg-current transition-all duration-300',
                expand ? 'w-5 rotate-45' : 'w-4',
              )}
            />
            <div
              className={clsx(
                'absolute left-0 top-1/2 -mt-px h-0.5 w-4 origin-left bg-current transition-all duration-300',
                expand && '-translate-x-4 opacity-0',
              )}
            />
            <div
              className={clsx(
                'absolute bottom-0 left-0 h-0.5 origin-left bg-current transition-all duration-300',
                expand ? 'w-5 -rotate-45' : 'w-4',
              )}
            />
          </div>
        </button>
      </div>
      {expand &&
        createPortal(
          <div className="fixed left-0 top-14 block h-[calc(100vh-3.5rem)] w-full overflow-y-auto bg-background px-6 py-3 text-sm lg:hidden *:block *:border-b *:border-border [&>:last-child]:border-b-0">
            {isDevtools && (
              <>
                <div className="px-4 py-1 text-xs font-semibold text-muted-foreground">
                  Devtools Panels
                </div>
                {['Console', 'Network', 'Page', 'Storage', 'System'].map(
                  (tab) => (
                    <div
                      key={tab}
                      className="cursor-pointer px-4 py-2 leading-snug text-muted-foreground transition-colors hover:text-primary-text"
                      onClick={() => {
                        navigate({ search: location.search, hash: tab });
                        setExpand(false);
                      }}
                    >
                      <span>{tab}</span>
                    </div>
                  ),
                )}
                <Separator className="my-2" />
              </>
            )}
            <Link
              to="room-list"
              className="flex items-center gap-2 py-3 leading-snug text-muted-foreground transition-colors hover:text-primary-text"
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
