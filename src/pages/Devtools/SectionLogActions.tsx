import {
  ClearOutlined,
  DownloadOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import { Button, Space } from 'antd';
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
    <Space size={8}>
      <Tooltip title="Scroll to bottom">
        <Button
          size="small"
          icon={<VerticalAlignBottomOutlined />}
          onClick={() => scrollToSectionEnd(section)}
        />
      </Tooltip>
      <Button
        size="small"
        icon={<DownloadOutlined />}
        onClick={() => downloadSection(section, address)}
      >
        Download
      </Button>
      <Button
        size="small"
        icon={<ClearOutlined />}
        onClick={() => clearRecord(section)}
      >
        Clear
      </Button>
    </Space>
  );
};
