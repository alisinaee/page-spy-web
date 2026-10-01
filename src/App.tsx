import React from 'react';
import { HashRouter } from 'react-router-dom';
import RouteConfig from './routes/config';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './utils/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toast';

export const App = () => {
  return (
    <React.StrictMode>
      <HashRouter>
        <ErrorBoundary>
          <TooltipProvider>
            <AuthProvider>
              <RouteConfig />
              <Toaster />
            </AuthProvider>
          </TooltipProvider>
        </ErrorBoundary>
      </HashRouter>
    </React.StrictMode>
  );
};
