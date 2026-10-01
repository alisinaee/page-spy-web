import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatTehranDateTime } from '@/utils/tehran';
import { ArrowDownToLine, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { useSocketMessageStore } from '@/store/socket-message';
import useSearch from '@/utils/useSearch';
import {
  ensurePageSnapshot,
  normalizeForExport,
  suggestDeviceLogName,
} from '@/utils/device-session';
import { confirmLogFileName } from './save-log-dialog';

type SectionName = 'console' | 'network' | 'page' | 'storage' | 'system';

const downloadSection = async (section: SectionName, deviceId: string) => {
  const fileName = await confirmLogFileName(
    suggestDeviceLogName(deviceId, section),
  );
  if (!fileName) return;
  if (section === 'page') {
    await ensurePageSnapshot();
  }
  const state = useSocketMessageStore.getState();
  const rawData = {
    console: state.consoleMsg,
    network: state.networkMsg,
    page: state.pageMsg,
    storage: {
      storage: state.storageMsg,
      database: state.databaseMsg,
    },
    system: state.systemMsg,
  }[section];
  const data = normalizeForExport(rawData);
  const blob = new Blob(
    [
      JSON.stringify(
        {
          exportedAt: formatTehranDateTime(new Date()),
          deviceId,
          clientInfo: normalizeForExport(state.clientInfo),
          section,
          data,
        },
        null,
        2,
      ),
    ],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.endsWith('.json') ? fileName : fileName + '.json';
  anchor.click();
  URL.revokeObjectURL(url);
};

const scrollToSectionEnd = (section: SectionName) => {
  if (section === 'console') {
    window.dispatchEvent(new CustomEvent('devtools:scroll-console-end'));
    return;
  }
  if (section === 'network') {
    window.dispatchEvent(new CustomEvent('devtools:scroll-network-end'));
    const grid = document.querySelector(
      '.network-table .ReactVirtualized__Grid',
    ) as HTMLElement;
    if (grid) grid.scrollTop = grid.scrollHeight;
    return;
  }
  if (section === 'storage') {
    const el = document.querySelector('.storage-panel__content') as HTMLElement;
    if (el) el.scrollTop = el.scrollHeight;
    return;
  }
  if (section === 'page') {
    const iframe = document.querySelector(
      '.page-panel__content iframe',
    ) as HTMLIFrameElement;
    if (iframe?.contentDocument) {
      const scrollEl =
        iframe.contentDocument.scrollingElement ||
        iframe.contentDocument.documentElement ||
        iframe.contentDocument.body;
      if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
    }
    return;
  }
  if (section === 'system') {
    const el = document.querySelector('.system-content') as HTMLElement;
    if (el) el.scrollTop = el.scrollHeight;
    return;
  }
};

const ActionButton = ({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          variant="ghost"
          size="icon-touch"
          aria-label={label}
          onClick={onClick}
          className={cn('md:size-8 md:min-h-0 md:min-w-0', className)}
        />
      }
    >
      {children}
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

export const SectionLogActions = ({ section }: { section: SectionName }) => {
  const { t } = useTranslation();
  const clearRecord = useSocketMessageStore((state) => state.clearRecord);
  const { address = '' } = useSearch();

  return (
    <>
      {section !== 'console' && (
        <ActionButton
          label={t('common.scroll-bottom', {
            defaultValue: 'Scroll to bottom',
          })}
          onClick={() => scrollToSectionEnd(section)}
        >
          <ArrowDownToLine />
        </ActionButton>
      )}
      <ActionButton
        label={t('common.download', { defaultValue: 'Download' })}
        onClick={() => downloadSection(section, address)}
      >
        <Download />
      </ActionButton>
      <ActionButton
        label={t('common.clear')}
        onClick={() => clearRecord(section)}
        className="hover:text-destructive"
      >
        <Trash2 />
      </ActionButton>
    </>
  );
};
