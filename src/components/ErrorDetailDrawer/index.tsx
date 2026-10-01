import { LoadingFallback } from '@/components/LoadingFallback';
import { getOriginFragments } from '@/utils/parseError';
import { useEventListener } from '@/utils/useEventListener';
import { Crosshair, Frown } from 'lucide-react';
import { useRequest } from 'ahooks';
import { DetailPane } from '@/components/panel';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { message } from '@/utils/message';
import clsx from 'clsx';
import { memo, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import './index.css';
import { BlockTitle } from '@/components/BlockTitle';

export type RequiredFrames = Required<StackFrame>[];

const TAB_SIZE = [2, 4, 6, 8];

const ErrorStackItem = ({ frame }: { frame: Required<StackFrame> }) => {
  const { t } = useTranslation('translation', {
    keyPrefix: 'console.error-trace',
  });
  const [tabSize, setTabSize] = useState(2);
  const {
    data,
    run: requestChunk,
    error,
    loading,
  } = useRequest(
    async () => {
      return getOriginFragments(frame);
    },
    {
      manual: true,
      onError(e) {
        message.error(e.message);
      },
    },
  );

  const stackFilename = useMemo(() => {
    return `${frame.fileName}(${frame.lineNumber}:${frame.columnNumber})`;
  }, [frame]);

  const content = useMemo(() => {
    if (loading) {
      return <LoadingFallback />;
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
          <Frown className="w-12 h-12 text-warning" />
          <h4 className="text-base font-semibold">{t('failed-title')}</h4>
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">{t('failed-advice')}</p>
            <p>
              <Trans i18nKey="console.error-trace.fix-suggestion-1">
                <span>slot-0</span>
                <code>slot-1</code>
                <span>slot-2</span>
              </Trans>
            </p>
            <p>{t('fix-suggestion-2')}</p>
          </div>
        </div>
      );
    }

    if (!data?.highlightedHTML) {
      return null;
    }

    return (
      <div className="source-code-fragments relative">
        <div className="fragments-header absolute inset-x-3 top-2.5 flex flex-nowrap items-center justify-between py-1">
          <div className="origin-filename mr-2 inline-flex h-9 items-center overflow-x-auto overflow-y-hidden whitespace-nowrap text-xs text-muted-foreground">
            <code>
              <span>{t('source-filename')}: </span>
              <span>
                {data.source}({data.line}:{data.column})
              </span>
            </code>
          </div>
          {data.useTabs && (
            <select
              aria-label="Tab size"
              value={tabSize}
              onChange={(e) => setTabSize(Number(e.target.value))}
              className="h-11 rounded border border-border bg-secondary px-2 text-base md:h-8 md:text-xs"
            >
              {TAB_SIZE.map((size) => (
                <option key={size} value={size}>
                  \t = {size} Space
                </option>
              ))}
            </select>
          )}
        </div>
        <div
          style={{
            // @ts-ignore
            '--start': data.start,
            '--error-line': data.line,
          }}
          dangerouslySetInnerHTML={{
            __html:
              data.highlightedHTML.replace(/\t/g, ' '.repeat(tabSize)) || '',
          }}
        />
      </div>
    );
  }, [data, error, loading, t, tabSize]);

  return (
    <div className="error-stack-item [&~.error-stack-item]:mt-3">
      <div className="stack-filename mb-1 flex flex-nowrap items-center gap-3 overflow-hidden">
        <Tooltip>
          <TooltipTrigger
            render={
              <code className="block min-w-0 max-w-[85%] truncate text-xs md:text-sm">
                {stackFilename}
              </code>
            }
          />
          <TooltipContent>{stackFilename}</TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="icon-touch"
          aria-label={t('locate', { defaultValue: 'Locate source' })!}
          onClick={requestChunk}
          className="shrink-0 text-primary-text hover:text-foreground md:size-8 md:min-h-0 md:min-w-0"
        >
          <Crosshair className={clsx({ 'animate-spin': loading })} />
        </Button>
      </div>
      {content}
    </div>
  );
};

export const ErrorDetailDrawer = memo(() => {
  const { t } = useTranslation('translation', {
    keyPrefix: 'console.error-trace',
  });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const errorMessage = useMemo(() => {
    if (error) {
      return [error.name, error.message].every((i) => error.stack?.includes(i))
        ? error.stack
        : `${error.name}: ${error.message}\n${error.stack}`;
    }
    return '';
  }, [error]);
  const [frames, setFrames] = useState<RequiredFrames>([]);

  useEventListener('source-code-detail', (evt) => {
    const { detail } = evt as CustomEvent;
    setOpen(true);
    setError(detail.error);
    setFrames(detail.frames);
  });

  return (
    <DetailPane open={open} onClose={() => setOpen(false)} title={t('title')}>
      <div className="error-detail-drawer space-y-4 p-3">
        <BlockTitle title={t('message-title')} />
        {errorMessage ? (
          <div className="error-message-box overflow-auto rounded-md bg-destructive/10 px-3 py-2 font-mono text-xs leading-snug text-destructive md:text-sm">
            <pre>
              <code>{errorMessage}</code>
            </pre>
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-muted-foreground">
            {t('no-message', { defaultValue: 'No error message' })}
          </div>
        )}
        <BlockTitle title={t('stack-title')} />
        {frames?.map((f, index) => (
          <ErrorStackItem key={f.fileName + index} frame={f} />
        ))}
      </div>
    </DetailPane>
  );
});
