import { SpyConsole } from '@huolala-tech/page-spy-types';
import ErrorStackSvg from '@/assets/image/error-stack.svg?react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ErrorStackParser from 'error-stack-parser';

export type RequiredFrames = Required<StackFrame>[];

// Caught exceptions, e.g. throw new Error()
export const getStackFramesIfErrorTrace = (item: SpyConsole.DataItem) => {
  if (item.logType === 'error' && item.errorDetail && item.errorDetail.stack) {
    const error = new Error();

    const { name, message, stack } = item.errorDetail;
    error.name = name;
    error.message = message;
    error.stack = stack;
    const frames = ErrorStackParser.parse(error).filter(
      ({ fileName, lineNumber, columnNumber }) => {
        return [fileName, lineNumber, columnNumber].every(Boolean);
      },
    ) as RequiredFrames;
    if (frames.length)
      return {
        error,
        frames,
      };
  }
  return false;
};

// console.error('Hello', new Error())
//                        ⬆
export const getStackFramesIfErrorConsole = (
  log: SpyConsole.DataItem['logs'][number],
) => {
  // parser may throw error if the error object's stack is invalid, e.g.
  // ```
  // const e = new Error()
  // e.message = e.stack = '';
  // console.error('Error', e);
  // ```
  try {
    if (log.type === 'error' && log.value) {
      const error = new Error();
      error.stack = log.value;
      const frames = ErrorStackParser.parse(error).filter(
        ({ fileName, lineNumber, columnNumber }) => {
          return [fileName, lineNumber, columnNumber].every(Boolean);
        },
      ) as RequiredFrames;
      if (frames.length)
        return {
          error,
          frames,
        };
    }
  } catch (e) {
    console.error('Error occurred while parsing error stack', log, e);
  }

  return false;
};

interface Props {
  data: { error: Error; frames: RequiredFrames };
}
export const ErrorTraceNode = ({ data }: Props) => {
  const { t } = useTranslation();
  const onPopupDetail = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('source-code-detail', {
        detail: data,
      }),
    );
  }, [data]);

  const errorMessage = useMemo(() => {
    const { error } = data;
    if (error) {
      return [error.name, error.message].every((i) => error.stack?.includes(i))
        ? error.stack
        : `${error.name}: ${error.message}\n${error.stack}`;
    }
    return '';
  }, [data]);

  return (
    <div className="error-trace flex flex-nowrap items-start">
      <button
        type="button"
        aria-label={t('console.error-trace.title')!}
        onClick={onPopupDetail}
        className="error-trace-icon inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ErrorStackSvg style={{ width: 16, height: 16 }} />
      </button>
      <div className="error-trace-node flex-1 px-2 text-xs md:text-sm">
        <code>{errorMessage}</code>
      </div>
    </div>
  );
};
