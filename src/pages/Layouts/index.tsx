import { Outlet } from 'react-router-dom';
import { Suspense } from 'react';
import { LoadingFallback } from '@/components/LoadingFallback';
import { NavMenuOnPc, NavMenuOnMobile } from './NavMenu';
import { Logo } from './Logo';
import { useTitle } from 'ahooks';
import { BRAND_NAME } from '@/utils/brand';

export const Layouts = () => {
  useTitle(BRAND_NAME);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="flex justify-between items-center px-4 md:px-6 h-14">
          <div className="flex items-center gap-4">
            <Logo />
          </div>
          <div className="flex items-center">
            <NavMenuOnPc />
            <NavMenuOnMobile />
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col min-h-0">
        <Suspense fallback={<LoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};
