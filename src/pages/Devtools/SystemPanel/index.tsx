import { memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SectionLogActions } from '../SectionLogActions';
import { useSocketMessageStore } from '@/store/socket-message';
import SystemContent from '@/components/SystemContent';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

const SystemPanel = memo(() => {
  const [systemMsg, refresh] = useSocketMessageStore(
    useShallow((state) => [state.systemMsg, state.refresh]),
  );

  const { t } = useTranslation();

  return (
    <div className="system-panel flex flex-col h-full">
      <div className="flex justify-end p-2 border-b border-border">
        <div className="flex items-center gap-2">
          <SectionLogActions section="system" />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-touch"
                  variant="outline"
                  onClick={() => {
                    refresh('system');
                  }}
                  aria-label={t('common.refresh')!}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              }
            />
            <TooltipContent>{t('common.refresh')}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {systemMsg.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No system data
          </div>
        ) : (
          <SystemContent data={systemMsg} />
        )}
      </div>
    </div>
  );
});

export default SystemPanel;
