import { ArrowDownToLine, ChevronRight, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Shortcuts } from '../Shortcuts';
import { useSocketMessageStore } from '@/store/socket-message';
import { useRef, useState, useEffect, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { KeyboardEvent } from 'react';
import { useMiscStore } from '@/store/misc';
import { useShallow } from 'zustand/react/shallow';

const EXECUTE_HISTORY_ID = 'page_spy_execute_history';
const EXECUTE_HISTORY_MAX_SIZE = 100;

export const FooterInput = memo(() => {
  const { t } = useTranslation('translation', { keyPrefix: 'console' });
  const [socket, clearRecord] = useSocketMessageStore(
    useShallow((state) => [state.socket, state.clearRecord]),
  );

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [code, setCode] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const executeHistory = useRef<string[]>(
    JSON.parse(localStorage.getItem(EXECUTE_HISTORY_ID) || '[]'),
  );
  const [focused, setFocused] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [isAutoScroll, setIsAutoScroll] = useMiscStore((state) => [
    state.isAutoScroll,
    state.setIsAutoScroll,
  ]);

  useEffect(() => {
    inputRef.current?.focus();

    const storage = executeHistory.current;
    setCurrentIndex(storage.length);
    return () => {
      const size = storage.length;
      const diff = size - EXECUTE_HISTORY_MAX_SIZE;
      if (diff > 0) {
        const sliceData = storage.slice(diff);
        localStorage.setItem(EXECUTE_HISTORY_ID, JSON.stringify(sliceData));
      }
    };
  }, []);

  // Lift the input above the on-screen keyboard while it is focused.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!focused || !vv) {
      setKeyboardInset(0);
      return;
    }
    const update = () => {
      const inset = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardInset(Math.max(0, Math.round(inset)));
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [focused]);

  const handleDebugCode = useCallback(() => {
    const trimedCode = code.trim();
    if (trimedCode) {
      socket?.unicastMessage({
        type: 'debug',
        data: trimedCode,
      });

      setCode('');
      const historyStorage = executeHistory.current;
      if (trimedCode === historyStorage[historyStorage.length - 1]) return;
      historyStorage.push(trimedCode);
      setCurrentIndex(historyStorage.length);
      localStorage.setItem(EXECUTE_HISTORY_ID, JSON.stringify(historyStorage));
    }
  }, [code, socket]);

  const clear = useCallback(() => {
    clearRecord('console');
  }, [clearRecord]);

  const onTextareaKeyDown = useCallback(
    // eslint-disable-next-line complexity
    (evt: KeyboardEvent<HTMLTextAreaElement>) => {
      evt.stopPropagation();
      const { key, keyCode, shiftKey, metaKey, ctrlKey, target: ta } = evt;
      const { selectionStart, selectionEnd } = ta as HTMLTextAreaElement;

      // Enter
      const isEnter = key === 'Enter' || keyCode === 13;
      if (isEnter) {
        evt.preventDefault();
        if (shiftKey) {
          const before = code.slice(0, selectionStart);
          const rest = code.slice(selectionStart);
          setCode(`${before}\n${rest}`);
          setTimeout(() => {
            (ta as HTMLTextAreaElement).selectionStart = before.length + 1;
            (ta as HTMLTextAreaElement).selectionEnd = before.length + 1;
          });
        } else {
          if (code.trim() === 'clear()') {
            setCode('');
            clear();
            return;
          }
          handleDebugCode();
        }
        return;
      }

      // clear function
      const isK = key === 'k' || keyCode === 75;
      const isL = key === 'l' || keyCode === 76;
      if ((isK && metaKey) || (isL && ctrlKey)) {
        evt.preventDefault();
        setCode('');
        clear();
        return;
      }

      // Tab
      const isTab = key === 'Tab' || keyCode === 9;
      if (isTab) {
        evt.preventDefault();
        const before = `${code.slice(0, selectionStart)}  `;
        const rest = code.slice(selectionStart);
        setCode(`${before}${rest}`);
        setTimeout(() => {
          (ta as HTMLTextAreaElement).selectionStart = before.length;
          (ta as HTMLTextAreaElement).selectionEnd = before.length;
        });
      }

      //  Up or Down
      if (selectionStart !== selectionEnd) return;

      const isUp = key === 'ArrowUp' || keyCode === 38;
      const isDown = key === 'ArrowDown' || keyCode === 40;
      if (!isUp && !isDown) return;

      const codeSlice = code.split('\n');
      let index = null;
      let boundary = null;
      const hasHistory = executeHistory.current.length > 0;
      if (isUp) {
        const firstLine = codeSlice[0] || '';
        boundary = firstLine.length;
        if (selectionStart <= boundary && hasHistory) {
          if (currentIndex === 0) return;
          index = currentIndex - 1;
        }
      } else {
        const lastLine = [...codeSlice].pop() || '';
        boundary = code.length - lastLine.length - codeSlice.length + 1;
        if (selectionStart >= boundary && hasHistory) {
          if (currentIndex === executeHistory.current.length - 1) return;
          index = currentIndex + 1;
        }
      }
      if (index !== null) {
        const codeData = executeHistory.current[index!];
        setCode(codeData);
        setCurrentIndex(index!);
        setTimeout(() => {
          (ta as HTMLTextAreaElement).selectionStart = codeData.length;
          (ta as HTMLTextAreaElement).selectionEnd = codeData.length;
        });
      }
    },
    [clear, code, currentIndex, handleDebugCode],
  );

  return (
    <div
      className="page-spy-input sticky bottom-0 z-10 flex shrink-0 items-center gap-1 border-t border-border bg-card px-2 py-1.5"
      style={keyboardInset ? { paddingBottom: keyboardInset } : undefined}
    >
      <ChevronRight className="size-4 shrink-0 text-primary-text" />
      <textarea
        ref={inputRef}
        spellCheck="false"
        autoCapitalize="off"
        autoCorrect="off"
        aria-label={t('placeholder')!}
        placeholder={t('placeholder')!}
        rows={1}
        value={code}
        onChange={(evt) => setCode(evt.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="mono-code max-h-32 min-h-11 min-w-0 flex-1 resize-none border-0 bg-transparent px-1 py-2.5 font-mono text-base text-foreground outline-none placeholder:text-muted-foreground md:min-h-8 md:py-1.5 md:text-sm"
        onKeyDown={onTextareaKeyDown}
      />
      <Button
        variant="default"
        size="touch"
        className="md:h-8 md:min-h-0 md:text-sm"
        onClick={handleDebugCode}
      >
        {t('run')}
      </Button>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-touch"
              className={cn('md:size-8 md:min-h-0 md:min-w-0')}
              onClick={() => {
                setIsAutoScroll(true);
                window.dispatchEvent(
                  new CustomEvent('devtools:scroll-console-end'),
                );
              }}
              aria-label={
                t('scroll-to-end', { defaultValue: 'Scroll to end' })!
              }
            />
          }
        >
          <ArrowDownToLine />
        </TooltipTrigger>
        <TooltipContent>
          {t('scroll-to-end', { defaultValue: 'Scroll to end' })}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-touch"
              className={cn('md:size-8 md:min-h-0 md:min-w-0')}
              onClick={() => {
                setIsAutoScroll(!isAutoScroll);
              }}
              aria-label={
                !isAutoScroll ? t('auto-scroll-on')! : t('auto-scroll-off')!
              }
              aria-pressed={isAutoScroll}
            />
          }
        >
          {!isAutoScroll ? <Play /> : <Pause />}
        </TooltipTrigger>
        <TooltipContent>
          {!isAutoScroll ? t('auto-scroll-on') : t('auto-scroll-off')}
        </TooltipContent>
      </Tooltip>
      <Shortcuts />
    </div>
  );
});
