import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Component, ReactNode } from 'react';
import './index.css';
import { useTranslation } from 'react-i18next';

const ErrorElement = ({ error }: { error: Error }) => {
  const { t } = useTranslation();
  return (
    <div className="error-boundary flex h-dvh w-screen items-center justify-center">
      <div className="error-container">
        <div className="flex items-center gap-8 flex-col sm:flex-row">
          <div className="logo relative size-20 shrink-0 grayscale-[0.4]" />
          <div>
            <h3 className="text-xl font-bold mb-2">{t('error.oops')}</h3>
            <p className="error-actions flex items-center flex-wrap gap-2 text-sm text-muted-foreground">
              {t('error.actions')}
              <Button
                size="touch"
                variant="outline"
                onClick={() => {
                  window.location.reload();
                }}
              >
                <RotateCw />
                {t('error.try-again')}
              </Button>
            </p>
          </div>
        </div>
        <div className="error-detail mt-8 max-h-[400px] max-w-[55vw] overflow-auto rounded-lg border-2 border-border p-3 text-sm text-destructive">
          <pre>{error.stack}</pre>
        </div>
      </div>
    </div>
  );
};

export class ErrorBoundary extends Component<{ children: ReactNode }> {
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  state: { error?: Error } = {};

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return <ErrorElement error={error} />;
  }
}
