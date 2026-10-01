import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CircleAlert,
  Copy,
  Download,
  Film,
  Play,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import copy from 'copy-to-clipboard';
import { deleteSpyLog, getSpyLogs } from '@/apis';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PanelEmpty,
  PanelToolbar,
  SearchField,
  useIsDesktop,
} from '@/components/panel';
import { message } from '@/utils/message';
import {
  Recording,
  downloadRecording,
  descriptionParagraphs,
  formatAbsolute,
  formatRelative,
  formatSize,
  logFileUrl,
  toRecording,
  viewerPath,
} from './utils';

const PAGE_SIZE = 20;

const useRecordingActions = (onDelete: (rec: Recording) => void) => {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState('');
  const download = useCallback(
    async (rec: Recording) => {
      setBusyId(rec.fileId);
      try {
        await downloadRecording(logFileUrl(rec.fileId), rec.name || rec.fileId);
      } catch (e: any) {
        message.error(
          e?.message ||
            t('recordings.download-failed', {
              defaultValue: 'Could not download the recording',
            }),
        );
      } finally {
        setBusyId('');
      }
    },
    [t],
  );
  return { busyId, download, onDelete };
};

type Actions = ReturnType<typeof useRecordingActions>;

const noteOf = (rec: Recording) => rec.remark.trim();

const RowActions = ({
  rec,
  actions,
  compact,
}: {
  rec: Recording;
  actions: Actions;
  compact?: boolean;
}) => {
  const { t } = useTranslation();
  const iconClass = 'md:size-8 md:min-h-0 md:min-w-0';
  return (
    <div className="flex items-center gap-1">
      <Button
        size={compact ? 'icon-touch' : 'touch'}
        className={
          compact ? iconClass : 'flex-1 md:h-8 md:flex-none md:text-sm'
        }
        aria-label={
          compact ? t('recordings.open', { defaultValue: 'Open' })! : undefined
        }
        nativeButton={false}
        render={<Link to={viewerPath(rec)} />}
      >
        <Play />
        {!compact && t('recordings.open', { defaultValue: 'Open' })}
      </Button>
      <Button
        variant="outline"
        size="icon-touch"
        className={iconClass}
        aria-label={t('recordings.download', { defaultValue: 'Download' })!}
        disabled={actions.busyId === rec.fileId}
        onClick={() => actions.download(rec)}
      >
        <Download />
      </Button>
      <Button
        variant="destructive"
        size="icon-touch"
        className={iconClass}
        aria-label={t('recordings.delete', { defaultValue: 'Delete' })!}
        onClick={() => actions.onDelete(rec)}
      >
        <Trash2 />
      </Button>
    </div>
  );
};

const titleOf = (rec: Recording) => rec.logTitle.trim() || noteOf(rec);

const descriptionOf = (rec: Recording) => {
  const title = rec.logTitle.trim();
  const note = noteOf(rec);
  if (!title || !note || note === title) return '';
  return note;
};

const Description = ({ text }: { text: string }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const paragraphs = descriptionParagraphs(text);
  return (
    <div className="flex items-start gap-3 px-1 py-2">
      <div dir="auto" className="min-w-0 flex-1 space-y-1 text-sm leading-6">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="break-words">
            {paragraph}
          </p>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => {
          if (!copy(text)) return;
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        }}
      >
        <Copy />
        {copied
          ? t('common.copied', { defaultValue: 'Copied' })
          : t('common.copy', { defaultValue: 'Copy' })}
      </Button>
    </div>
  );
};

const Title = ({ rec }: { rec: Recording }) => {
  const { t } = useTranslation();
  const title = titleOf(rec);
  if (!title) {
    return (
      <span className="text-muted-foreground">
        {t('recordings.no-note', { defaultValue: 'No note' })}
      </span>
    );
  }
  return <span className="block truncate font-medium">{title}</span>;
};

const RecordingCard = ({
  rec,
  actions,
  locale,
}: {
  rec: Recording;
  actions: Actions;
  locale: string;
}) => (
  <Card className="gap-2 p-3">
    <div className="text-sm font-medium">
      <Title rec={rec} />
    </div>
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <code className="max-w-full truncate font-mono text-foreground">
        {rec.deviceId || '--'}
      </code>
      {rec.project && <span className="truncate">{rec.project}</span>}
      <span>{formatSize(rec.size)}</span>
    </div>
    <div className="text-xs text-muted-foreground">
      <time dateTime={rec.createdAt} title={formatAbsolute(rec.createdAt)}>
        {formatRelative(rec.createdAt, locale)}
      </time>
      <span aria-hidden="true"> · </span>
      <span className="font-mono">{formatAbsolute(rec.createdAt)}</span>
    </div>
    {descriptionOf(rec) ? <Description text={descriptionOf(rec)} /> : null}
    <RowActions rec={rec} actions={actions} />
  </Card>
);

const RecordingsTable = ({
  list,
  actions,
  locale,
}: {
  list: Recording[];
  actions: Actions;
  locale: string;
}) => {
  const { t } = useTranslation();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            {t('recordings.note', { defaultValue: 'Note' })}
          </TableHead>
          <TableHead>{t('common.device-id')}</TableHead>
          <TableHead>{t('common.project')}</TableHead>
          <TableHead>{t('common.createdAt')}</TableHead>
          <TableHead>
            {t('recordings.size', { defaultValue: 'Size' })}
          </TableHead>
          <TableHead className="text-right">{t('common.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((rec) => {
          const description = descriptionOf(rec);
          return (
            <Fragment key={rec.fileId}>
              <TableRow>
                <TableCell className="max-w-56">
                  <Title rec={rec} />
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {rec.deviceId || '--'}
                </TableCell>
                <TableCell>{rec.project || '--'}</TableCell>
                <TableCell>
                  <div>{formatRelative(rec.createdAt, locale)}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {formatAbsolute(rec.createdAt)}
                  </div>
                </TableCell>
                <TableCell>{formatSize(rec.size)}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <RowActions rec={rec} actions={actions} compact />
                  </div>
                </TableCell>
              </TableRow>
              {description ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="bg-muted/30 py-1">
                    <Description text={description} />
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
};

const Skeletons = ({ desktop }: { desktop: boolean }) =>
  desktop ? (
    <div className="flex flex-col gap-2 p-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  ) : (
    <div className="flex flex-col gap-3 p-3" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="gap-2 p-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-11 w-full" />
        </Card>
      ))}
    </div>
  );

const Recordings = () => {
  const { t, i18n } = useTranslation();
  const isDesktop = useIsDesktop();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Recording[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState<Recording | null>(null);
  const [deleting, setDeleting] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (nextPage: number) => {
    requestId.current += 1;
    const id = requestId.current;
    if (nextPage === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await getSpyLogs({ page: nextPage, size: PAGE_SIZE });
      if (id !== requestId.current) return;
      const rows = (res.data?.data || []).map(toRecording);
      setItems((prev) => (nextPage === 1 ? rows : [...prev, ...rows]));
      setTotal(res.data?.total || 0);
      setPage(nextPage);
      setError('');
    } catch (e: any) {
      if (id !== requestId.current) return;
      setError(e?.message || 'Request failed');
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...items].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1,
    );
    if (!q) return sorted;
    return sorted.filter((rec) =>
      [rec.project, rec.title, rec.logTitle, rec.remark, rec.deviceId].some(
        (v) => v.toLowerCase().includes(q),
      ),
    );
  }, [items, query]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteSpyLog([toDelete.fileId]);
      setItems((prev) => prev.filter((r) => r.fileId !== toDelete.fileId));
      setTotal((n) => Math.max(0, n - 1));
      setToDelete(null);
    } catch (e: any) {
      message.error(e?.message || 'Request failed');
    } finally {
      setDeleting(false);
    }
  };

  const actions = useRecordingActions(setToDelete);
  const locale = i18n.language;
  const canLoadMore = items.length < total && !query.trim();

  const renderBody = () => {
    if (loading) return <Skeletons desktop={isDesktop} />;
    if (error && items.length === 0) {
      return (
        <div className="flex h-full p-3">
          <PanelEmpty
            icon={<CircleAlert className="text-destructive" />}
            title={t('recordings.load-failed', {
              defaultValue: 'Could not load recordings',
            })}
            description={error}
            action={
              <Button
                size="touch"
                variant="outline"
                className="md:h-9 md:text-sm"
                onClick={() => load(1)}
              >
                {t('common.retry', { defaultValue: 'Retry' })}
              </Button>
            }
          />
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <div className="flex h-full p-3">
          <PanelEmpty
            icon={<Film />}
            title={
              query.trim()
                ? t('recordings.no-match', {
                    defaultValue: 'No matching recordings',
                  })
                : t('recordings.empty', { defaultValue: 'No recordings yet' })
            }
            description={
              query.trim()
                ? undefined
                : String(
                    t('recordings.empty-hint', {
                      defaultValue:
                        'On the device: Clear, reproduce the bug, then Upload logs',
                    }),
                  )
            }
          />
        </div>
      );
    }
    return (
      <>
        {isDesktop ? (
          <RecordingsTable list={filtered} actions={actions} locale={locale} />
        ) : (
          <div className="flex flex-col gap-3 p-3">
            {filtered.map((rec) => (
              <RecordingCard
                key={rec.fileId}
                rec={rec}
                actions={actions}
                locale={locale}
              />
            ))}
          </div>
        )}
        {error && (
          <p className="px-3 pb-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {canLoadMore && (
          <div className="flex justify-center p-3">
            <Button
              variant="outline"
              size="touch"
              className="md:h-9 md:text-sm"
              disabled={loadingMore}
              onClick={() => load(page + 1)}
            >
              {loadingMore
                ? t('recordings.loading-more', { defaultValue: 'Loading…' })
                : t('recordings.load-more', { defaultValue: 'Load more' })}
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background text-foreground">
      <PanelToolbar
        className="sticky top-0 z-10"
        search={
          <SearchField
            value={query}
            onChange={setQuery}
            label={String(
              t('recordings.search-label', {
                defaultValue: 'Search recordings',
              }),
            )}
            placeholder={String(
              t('recordings.search-placeholder', {
                defaultValue: 'Search note, project or title',
              }),
            )}
          />
        }
        actions={
          <Button
            variant="ghost"
            size="icon-touch"
            className="md:size-8 md:min-h-0 md:min-w-0"
            aria-label={String(t('common.refresh'))}
            onClick={() => load(1)}
          >
            <RefreshCw />
          </Button>
        }
      >
        <span className="px-1 text-sm text-muted-foreground" aria-live="polite">
          {t('recordings.count', {
            defaultValue: '{{count}} recordings',
            count: query.trim() ? filtered.length : total,
          })}
        </span>
      </PanelToolbar>

      <div className="min-h-0 flex-1 overflow-y-auto">{renderBody()}</div>

      <Dialog
        open={!!toDelete}
        onOpenChange={(open) => !open && !deleting && setToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('recordings.delete-title', {
                defaultValue: 'Delete this recording?',
              })}
            </DialogTitle>
            <DialogDescription>
              {t('recordings.delete-desc', {
                defaultValue: 'This removes the uploaded logs from the server.',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              size="touch"
              className="flex-1 md:h-8 md:flex-none md:text-sm"
              disabled={deleting}
              onClick={() => setToDelete(null)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              size="touch"
              className="flex-1 md:h-8 md:flex-none md:text-sm"
              disabled={deleting}
              onClick={confirmDelete}
            >
              {t('recordings.delete', { defaultValue: 'Delete' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Recordings;
