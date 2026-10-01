import { usePopupRef, withPopup } from '@/utils/withPopup';
import KeyboardSvg from '@/assets/image/keyboard.svg?react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Fragment, memo, useMemo } from 'react';
import './index.less';
import { useTranslation } from 'react-i18next';

const ShortcutsModal = withPopup(({ resolve, visible }) => {
  const { t } = useTranslation('translation', { keyPrefix: 'shortcuts' });

  const shortcuts: {
    keys: string[];
    description: string;
    relation?: 'union' | 'intersection';
  }[] = useMemo(() => {
    return [
      {
        keys: ['Enter'],
        description: t('enter'),
      },
      {
        keys: ['Tabs'],
        description: t('tab'),
      },
      {
        keys: ['Shift', 'Enter'],
        relation: 'intersection',
        description: t('shift+enter'),
      },
      {
        keys: ['⌘', 'K'],
        relation: 'intersection',
        description: t('cmd+k'),
      },
      {
        keys: ['Ctrl', 'L'],
        relation: 'intersection',
        description: t('ctrl+l'),
      },
      {
        keys: ['↑', '↓'],
        relation: 'union',
        description: t('updown'),
      },
    ];
  }, [t]);

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && resolve(null)}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          {shortcuts.map(({ keys, relation = 'intersection', description }) => {
            const relationSymbol = relation === 'union' ? 'or' : '+';
            const keySize = keys.length;
            return (
              <div
                key={keys.join('')}
                className="shortcuts-item flex items-center justify-between gap-4 py-1.5 border-b border-border/40 last:border-0"
              >
                <span className="shortcuts-item__desc text-sm text-muted-foreground">
                  {description}
                </span>
                <div className="flex items-center gap-1.5">
                  {keys.map((k, index) => (
                    <Fragment key={k}>
                      <kbd className="keyboard-button px-2 py-1 text-xs font-mono font-semibold rounded bg-muted text-foreground border border-border">
                        {k}
                      </kbd>
                      {keySize > 1 && index !== keySize - 1 && (
                        <span className="text-xs text-muted-foreground">
                          {relationSymbol}
                        </span>
                      )}
                    </Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
});

export const Shortcuts = memo(() => {
  const { t } = useTranslation('translation', { keyPrefix: 'shortcuts' });
  const modalRef = usePopupRef();

  return (
    <div className="console-keyboard-shortcuts">
      <button
        type="button"
        title={t('title')!}
        className="p-1 text-muted-foreground hover:text-foreground bg-transparent border-0 cursor-pointer inline-flex items-center"
        onClick={() => {
          modalRef.current?.popup();
        }}
        aria-label="Keyboard shortcuts"
      >
        <KeyboardSvg className="size-5" />
      </button>
      <ShortcutsModal ref={modalRef} />
    </div>
  );
});
