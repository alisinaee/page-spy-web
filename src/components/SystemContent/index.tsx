import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { parseUserAgent } from '@/utils/brand';
import { SpySystem } from '@huolala-tech/page-spy-types';

interface SystemContentProps {
  data: SpySystem.DataItem[];
}

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section>
    <h3 className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
      {title}
    </h3>
    <div>{children}</div>
  </section>
);

const Row = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex min-h-11 items-center justify-between gap-4 border-b border-border px-3 py-2 text-sm md:min-h-9">
    <span className="shrink-0 text-muted-foreground">{label}</span>
    <span className="min-w-0 text-right font-mono text-xs break-all md:text-sm">
      {children}
    </span>
  </div>
);

const FeatureRow = ({ title, supported }: SpySystem.FeatureDescriptor) => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-b border-border px-3 py-2 text-sm md:min-h-9">
      <span className="min-w-0">{title}</span>
      <span
        className={
          supported
            ? 'flex shrink-0 items-center gap-1 text-success'
            : 'flex shrink-0 items-center gap-1 text-muted-foreground'
        }
      >
        {supported ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <X className="size-4" aria-hidden />
        )}
        {supported
          ? t('system.supported', { defaultValue: 'Supported' })
          : t('system.not-supported', { defaultValue: 'Not supported' })}
      </span>
    </div>
  );
};

const SystemContent = memo(({ data }: SystemContentProps) => {
  const { t } = useTranslation();
  const { features = {}, system } = data[0] || {};
  const clientInfo = useMemo(() => parseUserAgent(system?.ua), [system]);

  return (
    <div className="system-content mx-auto max-w-3xl">
      <Section title={t('system.device', { defaultValue: 'Device' })}>
        <Row label={t('system.os', { defaultValue: 'System' })}>
          {`${clientInfo?.os.name}/${clientInfo?.os.version}`}
        </Row>
      </Section>
      <Section title={t('system.browser', { defaultValue: 'Browser' })}>
        <Row label={t('system.platform', { defaultValue: 'Platform' })}>
          {`${clientInfo?.browser.name}/${clientInfo?.browser.version}`}
        </Row>
        <Row label="User Agent">{system?.ua}</Row>
      </Section>
      {Object.entries(
        features as Record<string, SpySystem.FeatureDescriptor[]>,
      ).map(([key, value]) => (
        <Section key={key} title={`${t('system.feature')} · ${key}`}>
          {value.map((feature) => (
            <FeatureRow key={feature.title} {...feature} />
          ))}
        </Section>
      ))}
    </div>
  );
});

export default SystemContent;
