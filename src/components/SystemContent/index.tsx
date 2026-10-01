import { memo, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { parseUserAgent } from '@/utils/brand';
import { SpySystem } from '@huolala-tech/page-spy-types';
import React from 'react';

interface SystemContentProps {
  data: SpySystem.DataItem[];
}

const FeatureItem = ({ title, supported }: SpySystem.FeatureDescriptor) => (
  <div className="flex items-center justify-between gap-2 text-sm">
    <span>{title}</span>
    <span className={supported ? 'text-success' : 'text-destructive'}>
      {supported ? '\u2713' : '\u2717'}
    </span>
  </div>
);

const SystemContent = memo(({ data }: SystemContentProps) => {
  const { t } = useTranslation('translation', { keyPrefix: 'system' });
  const { features = {}, system } = data[0] || {};
  const clientInfo = useMemo(() => {
    return parseUserAgent(system?.ua);
  }, [system]);

  const noSupport = useMemo(() => {
    if (!features) return [];
    return Object.values(
      features as Record<string, SpySystem.FeatureDescriptor[]>,
    ).reduce<SpySystem.FeatureDescriptor[]>((acc, cur) => {
      cur.forEach((item: SpySystem.FeatureDescriptor) => {
        if (!item.supported) {
          acc.push(item);
        }
      });
      return acc;
    }, []);
  }, [features]);

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No system data
      </div>
    );
  }
  return (
    <div className="system-content space-y-6 overflow-y-auto">
      <div className="system-info">
        <h3 className="text-base font-semibold mb-2">{t('overview')}</h3>
        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
              <span className="font-semibold text-muted-foreground w-28 shrink-0">
                System:
              </span>
              <span className="font-mono text-foreground">
                {`${clientInfo?.os.name}/${clientInfo?.os.version}`}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
              <span className="font-semibold text-muted-foreground w-28 shrink-0">
                Platform:
              </span>
              <span className="font-mono text-foreground">
                {`${clientInfo?.browser.name}/${clientInfo?.browser.version}`}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
              <span className="font-semibold text-muted-foreground w-28 shrink-0">
                User Agent:
              </span>
              <span className="font-mono text-xs text-foreground break-all">
                {system?.ua}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {Object.keys(features).length > 0 && (
        <>
          <div className="system-info">
            <h3 className="text-base font-semibold mb-2">{t('feature')}</h3>
            {!!noSupport.length && (
              <div className="mb-4">
                <h5 className="text-sm font-semibold text-destructive mb-2">
                  {t('unsupport')}
                </h5>
                <Card className="border-destructive/40 bg-destructive/10">
                  <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {noSupport.map((feature) => (
                      <FeatureItem key={feature.title} {...feature} />
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          {Object.entries(
            features as Record<string, SpySystem.FeatureDescriptor[]>,
          ).map(([key, value]) => {
            return (
              <div className="system-info" key={key}>
                <h5 className="text-sm font-semibold text-foreground/90 mb-2">
                  {key}
                </h5>
                <Card>
                  <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {value.map((feature: SpySystem.FeatureDescriptor) => (
                      <FeatureItem key={feature.title} {...feature} />
                    ))}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
});

export default SystemContent;
