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
          exportedAt: new Date().toISOString(),
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

export const SectionLogActions = ({ section }: { section: SectionName }) => {
  const clearRecord = useSocketMessageStore((state) => state.clearRecord);
  const { address = '' } = useSearch();

  return (
    <div className="flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => scrollToSectionEnd(section)}
            aria-label="Scroll to bottom"
          >
            <ArrowDownToLine className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Scroll to bottom</TooltipContent>
      </Tooltip>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs flex items-center gap-1"
        onClick={() => downloadSection(section, address)}
      >
        <Download className="size-3.5" />
        <span>Download</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs flex items-center gap-1 text-muted-foreground hover:text-destructive"
        onClick={() => clearRecord(section)}
      >
        <Trash2 className="size-3.5" />
        <span>Clear</span>
      </Button>
    </div>
  );
};
