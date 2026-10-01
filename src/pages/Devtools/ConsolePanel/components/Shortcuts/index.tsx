import { Fragment, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const Shortcuts = memo(() => {
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
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-touch"
            aria-label={t('title')!}
            className="md:size-8 md:min-h-0 md:min-w-0"
          />
        }
      >
        <Keyboard />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('title')}</DropdownMenuLabel>
          {shortcuts.map(({ keys, relation = 'intersection', description }) => {
            const relationSymbol = relation === 'union' ? 'or' : '+';
            const keySize = keys.length;
            return (
              <div
                key={keys.join('')}
                className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-1.5 last:border-0 md:min-h-9"
              >
                <span className="text-sm text-muted-foreground">
                  {description}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  {keys.map((k, index) => (
                    <Fragment key={k}>
                      <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
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
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
