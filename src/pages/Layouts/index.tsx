import { Outlet, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import { LoadingFallback } from '@/components/LoadingFallback';
import { Logo } from './Logo';
import { useTitle } from 'ahooks';
import { BRAND_NAME } from '@/utils/brand';

export const Layouts = () => {
  useTitle(BRAND_NAME);
  const { pathname } = useLocation();
  const isDevtools = pathname.includes('/devtools');

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {!isDevtools && (
        <header className="flex h-12 shrink-0 items-center border-b border-border bg-background px-4">
          <Logo />
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
