import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Component, ReactNode } from 'react';
import './index.css';
import { Trans, useTranslation } from 'react-i18next';

const ErrorElement = ({ error }: { error: Error }) => {
  const { t } = useTranslation();
  return (
    <div className="error-boundary flex h-screen w-screen items-center justify-center">
      <div className="error-container">
        <div className="flex items-center gap-8 flex-col sm:flex-row">
          <div className="logo relative size-20 shrink-0 grayscale-[0.4]" />
          <div>
            <h3 className="text-xl font-bold mb-2">😱 {t('error.oops')}</h3>
            <p className="error-actions flex items-center flex-wrap gap-2 text-sm text-muted-foreground">
              <Trans i18nKey="error.actions">
                You can take a
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="mx-1"
                >
                  <RotateCw className="h-3.5 w-3.5 mr-1" />
                  Try again
                </Button>
                or
                <a
                  href={`${import.meta.env.VITE_GITHUB_REPO}/issues`}
                  target="_blank"
                  rel="noreferrer"
                  className="mx-1 inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground"
                >
                  Report
                </a>
                the issue.
              </Trans>
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
