import { ClientRoomInfo } from '@/utils/brand';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  data: ClientRoomInfo[];
}

export const Statistics = memo(({ data }: Props) => {
  const { t } = useTranslation('translation', {
    keyPrefix: 'connections.status',
  });

  const { active, wait, inactive } = data.reduce(
    (acc, cur) => {
      const { connections } = cur;
      let hasClient: boolean = false;
      let hasDebugger: boolean = false;

      for (let k = 0; k <= connections.length - 1; k++) {
        const { userId } = connections[k];
        if (userId === 'Client') {
          hasClient = true;
        }
        if (userId === 'Debugger') {
          hasDebugger = true;
        }
        if (hasClient && hasDebugger) break;
      }
      if (hasClient && hasDebugger) {
        acc.active.push(cur);
      } else if (hasClient) {
        acc.wait.push(cur);
      } else {
        acc.inactive.push(cur);
      }
      return acc;
    },
    {
      active: [],
      wait: [],
      inactive: [],
    } as Record<'active' | 'wait' | 'inactive', ClientRoomInfo[]>,
  );

  return (
    <div className="statistic flex justify-between items-center py-2 px-3 border border-border/50 rounded-lg bg-card/40 my-3">
      <div className="statistics-item text-center">
        <p className="text-xs text-muted-foreground m-0">{t('active')}</p>
        <p className="text-base font-semibold text-emerald-500 m-0">
          {active.length}
        </p>
      </div>
      <div className="statistics-item text-center">
        <p className="text-xs text-muted-foreground m-0">{t('wait')}</p>
        <p className="text-base font-semibold text-amber-500 m-0">
          {wait.length}
        </p>
      </div>
      <div className="statistics-item text-center">
        <p className="text-xs text-muted-foreground m-0">{t('inactive')}</p>
        <p className="text-base font-semibold text-muted-foreground m-0">
          {inactive.length}
        </p>
      </div>
    </div>
  );
});
