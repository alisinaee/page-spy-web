import { Outlet } from 'react-router-dom';
import './index.less';
import { Suspense, useEffect } from 'react';
import { LoadingFallback } from '@/components/LoadingFallback';
import { NavMenuOnPc, NavMenuOnMobile } from './NavMenu';
import { Logo } from './Logo';
import { useTitle } from 'ahooks';
import { useDarkTheme } from '@/utils/useDarkTheme';
import { BRAND_NAME } from '@/utils/brand';

export const Layouts = () => {
  const isDark = useDarkTheme();
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useTitle(BRAND_NAME);

  return (
    <div className="layouts min-h-screen flex flex-col bg-background text-foreground">
      <header className="header border-b border-border/40 bg-background/95 backdrop-blur z-40 sticky top-0">
        <div className="flex justify-between items-center px-4 md:px-6 h-14">
          <div className="header-left flex items-center gap-4">
            <Logo />
          </div>
          <div className="header-right flex items-center">
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
