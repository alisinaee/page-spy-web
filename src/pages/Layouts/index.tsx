import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';
import { LoadingFallback } from '@/components/LoadingFallback';
import { Logo } from './Logo';
import { useTitle } from 'ahooks';
import { BRAND_NAME } from '@/utils/brand';

export const Layouts = () => {
  useTitle(BRAND_NAME);
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const isDevtools = pathname.includes('/devtools');

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {!isDevtools && (
        <header className="flex h-12 shrink-0 items-center border-b border-border bg-background px-4">
          <Logo />
          <nav
            aria-label={t('nav.label', { defaultValue: 'Main' })!}
            className="ml-3 flex items-center gap-1"
          >
            {[
              {
                to: '/room-list',
                label: t('nav.devices', { defaultValue: 'Devices' }),
              },
              {
                to: '/recordings',
                label: t('nav.recordings', { defaultValue: 'Recordings' }),
              },
            ].map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Button
                  key={item.to}
                  variant="ghost"
                  size="touch"
                  nativeButton={false}
                  render={<Link to={item.to} />}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'px-3 text-sm md:h-8 md:min-h-0',
                    active
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </header>
      )}
      <main className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<LoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};
