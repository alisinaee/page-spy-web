import { LoadingFallback } from '@/components/LoadingFallback';
import { getOriginFragments } from '@/utils/parseError';
import { useEventListener } from '@/utils/useEventListener';
import { Crosshair, Frown } from 'lucide-react';
import { useRequest } from 'ahooks';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
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
import './index.less';
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
          <Frown className="w-12 h-12 text-amber-500" />
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
      <div className="source-code-fragments">
        <div className="fragments-header flex items-center justify-between flex-nowrap py-1">
          <div className="origin-filename text-xs">
            <code>
              <span>{t('source-filename')}: </span>
              <span>
                {data.source}({data.line}:{data.column})
              </span>
            </code>
          </div>
          {data.useTabs && (
            <select
              value={tabSize}
              onChange={(e) => setTabSize(Number(e.target.value))}
              className="text-xs bg-secondary border border-border rounded px-2 py-1"
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
    <div className="error-stack-item">
      <div className="flex items-center gap-3 stack-filename flex-nowrap mb-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <code className="text-xs truncate block max-w-[85%] cursor-pointer">
                {stackFilename}
              </code>
            }
          />
          <TooltipContent>{stackFilename}</TooltipContent>
        </Tooltip>
        <Crosshair
          className={clsx(
            'locate-icon w-4 h-4 cursor-pointer text-muted-foreground hover:text-foreground shrink-0',
            {
              'animate-spin': loading,
            },
          )}
          onClick={requestChunk}
        />
      </div>
      {content}
    </div>
  );
};

export const ErrorDetailDrawer = memo(() => {
  const { t: ct } = useTranslation();
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto flex flex-col justify-between"
      >
        <div>
          <SheetHeader className="pb-4">
            <SheetTitle>{t('title')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <BlockTitle title={t('message-title')} />
            {errorMessage ? (
              <div className="error-message-box p-3 bg-secondary/50 rounded-md text-xs font-mono overflow-x-auto">
                <pre>
                  <code>{errorMessage}</code>
                </pre>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4 text-xs">
                No error message
              </div>
            )}
            <BlockTitle title={t('stack-title')} />
            {frames?.map((f, index) => (
              <ErrorStackItem key={f.fileName + index} frame={f} />
            ))}
          </div>
        </div>
        <SheetFooter className="pt-4 border-t border-border flex justify-end">
          <Button size="touch" onClick={() => setOpen(false)}>
            {ct('common.OK')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
