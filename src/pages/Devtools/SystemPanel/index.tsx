import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { PanelEmpty, PanelToolbar } from '@/components/panel';
import { useSocketMessageStore } from '@/store/socket-message';
import SystemContent from '@/components/SystemContent';
import { Cpu, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

const SystemPanel = memo(() => {
  const [systemMsg, refresh] = useSocketMessageStore(
    useShallow((state) => [state.systemMsg, state.refresh]),
  );
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelToolbar
        actions={
          <Button
            variant="ghost"
            size="icon-touch"
            aria-label={t('common.refresh')!}
            className="md:size-8 md:min-h-0 md:min-w-0"
            onClick={() => refresh('system')}
          >
            <RefreshCw />
          </Button>
        }
      >
        <span className="px-1 text-sm font-medium">
          {t('system.title', { defaultValue: 'System' })}
        </span>
      </PanelToolbar>
      <div className="min-h-0 flex-1 overflow-auto">
        {systemMsg.length === 0 ? (
          <PanelEmpty
            icon={<Cpu />}
            title={t('system.empty', { defaultValue: 'No system data' })}
          />
        ) : (
          <SystemContent data={systemMsg} />
        )}
      </div>
    </div>
  );
});

export default SystemPanel;
