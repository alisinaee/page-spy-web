import { ClearOutlined, DownloadOutlined } from '@ant-design/icons';
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

export const SectionLogActions = ({ section }: { section: SectionName }) => {
  const clearRecord = useSocketMessageStore((state) => state.clearRecord);
  const { address = '' } = useSearch();

  return (
    <Space size={8}>
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
