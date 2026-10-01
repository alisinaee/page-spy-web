import { ReactNode, useEffect, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

const DESKTOP_QUERY = '(min-width: 768px)';

export const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(
    () =>
      typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
};

/**
 * The bar at the top of every panel. Chips scroll sideways on phones so the
 * row never wraps; actions stay pinned to the right.
 */
export const PanelToolbar = ({
  children,
  actions,
  search,
  menu,
  className,
}: {
  children?: ReactNode;
  actions?: ReactNode;
  /** Inline on md+, a full-width second row on phones. */
  search?: ReactNode;
  /** Phone-only control pinned beside the scrolling chips. */
  menu?: ReactNode;
  className?: string;
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-border bg-background px-2 py-1.5 md:flex-nowrap',
        className,
      )}
    >
      <div
        ref={scrollerRef}
        className="order-1 flex min-w-0 flex-1 touch-pan-x items-center gap-1.5 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {menu && <div className="order-1 shrink-0 md:hidden">{menu}</div>}
      {search && (
        <div className="order-3 flex w-full min-w-0 md:order-2 md:w-auto md:max-w-md md:flex-1">
          {search}
        </div>
      )}
      {actions && (
        <div className="order-2 flex shrink-0 items-center gap-1 md:order-3">
          {actions}
        </div>
      )}
    </div>
  );
};

/** A toggle chip for filters (log level, request type, storage kind). */
export const FilterChip = ({
  active,
  onClick,
  children,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children?: ReactNode;
  icon?: ReactNode;
  label?: string;
}) => (
  <button
    type="button"
    aria-pressed={active}
    aria-label={label}
    onClick={onClick}
    className={cn(
      'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:px-2.5 md:text-xs [&_svg]:size-4 md:[&_svg]:size-3.5',
      active
        ? 'border-primary/40 bg-primary/15 text-foreground'
        : 'border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
    )}
  >
    {icon}
    {children}
  </button>
);

/** Search input sized for touch on phones and compact on desktop. */
export const SearchField = ({
  value,
  onChange,
  placeholder,
  label,
  className,
  resultIndex = 0,
  resultCount,
  onPrev,
  onNext,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  className?: string;
  /** 1-based match currently shown. 0 when nothing is selected. */
  resultIndex?: number;
  resultCount?: number;
  onPrev?: () => void;
  onNext?: () => void;
}) => {
  const { t } = useTranslation();
  const showNav = Boolean(value) && resultCount != null && onPrev && onNext;
  const step = (direction: -1 | 1) => {
    if (direction < 0) onPrev?.();
    else onNext?.();
  };
  return (
    <div className={cn('flex min-w-40 flex-1 items-center gap-0.5', className)}>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          aria-label={label}
          placeholder={placeholder ?? label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(event) => {
            if (!showNav) return;
            if (event.key !== 'Enter') return;
            event.preventDefault();
            step(event.shiftKey ? -1 : 1);
          }}
          className={cn(
            'h-11 pl-8 text-base md:h-8 md:text-sm',
            value && 'pr-9',
          )}
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              t('common.clear-search', { defaultValue: 'Clear search' })!
            }
            onClick={() => onChange('')}
            className="absolute top-1/2 right-0.5 size-8 -translate-y-1/2"
          >
            <X />
          </Button>
        )}
      </div>
      {showNav && (
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            aria-label={
              t('common.previous-result', {
                defaultValue: 'Previous result',
              })!
            }
            disabled={!resultCount}
            onClick={() => step(-1)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <ChevronUp className="size-4" />
          </button>
          <span
            className="min-w-10 text-center font-mono text-xs text-muted-foreground"
            aria-live="polite"
          >
            {resultCount ? `${resultIndex || 0}/${resultCount}` : '0/0'}
          </span>
          <button
            type="button"
            aria-label={
              t('common.next-result', { defaultValue: 'Next result' })!
            }
            disabled={!resultCount}
            onClick={() => step(1)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
};

const PANE_PREFIX = 'spy-tobank-pane:';

function readPaneWidth(
  key: string,
  fallback: number,
  min: number,
  max: number,
) {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(PANE_PREFIX + key);
  const next = raw ? Number(raw) : fallback;
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

/** Pixel width for a desktop pane, remembered across reloads. */
export function usePaneWidth({
  storageKey,
  fallback,
  min,
  max,
  reserve,
  frameRef,
  active = true,
}: {
  storageKey: string;
  fallback: number;
  min: number;
  max: number;
  /** Pixels that must stay free for the neighboring pane. */
  reserve: number;
  frameRef: RefObject<HTMLElement | null>;
  active?: boolean;
}) {
  const [stored, setStored] = useState(() =>
    readPaneWidth(storageKey, fallback, min, max),
  );
  const [limit, setLimit] = useState(max);

  useEffect(() => {
    if (!active) return;
    const row = frameRef.current?.parentElement;
    if (!row) return;
    const apply = () => {
      setLimit(Math.max(min, Math.min(max, row.clientWidth - reserve)));
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(row);
    return () => observer.disconnect();
  }, [active, frameRef, max, min, reserve]);

  const cap = Math.max(min, limit);
  const width = Math.min(Math.max(stored, min), cap);

  const setWidth = (next: number) => {
    const clamped = Math.min(Math.max(Math.round(next), min), cap);
    setStored(clamped);
    try {
      window.localStorage.setItem(PANE_PREFIX + storageKey, String(clamped));
    } catch {
      /* private mode */
    }
  };

  return {
    width,
    min,
    max: cap,
    setWidth,
    reset: () => setWidth(fallback),
  };
}

/**
 * Vertical drag handle between two desktop panes.
 * `edge="end"` grows the pane when the pointer moves right (left sidebar).
 * `edge="start"` grows the pane when the pointer moves left (right detail).
 */
export function PaneResizeHandle({
  label,
  edge,
  value,
  min,
  max,
  onChange,
  onReset,
}: {
  label: string;
  edge: 'start' | 'end';
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  onReset: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const sign = edge === 'end' ? 1 : -1;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    const startX = event.clientX;
    const startWidth = value;
    handle.setPointerCapture(event.pointerId);
    setDragging(true);
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const move = (ev: PointerEvent) => {
      const next = startWidth + sign * (ev.clientX - startX);
      onChange(Math.min(max, Math.max(min, next)));
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      setDragging(false);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  };

  const nudge = (delta: number) => {
    onChange(Math.min(max, Math.max(min, value + delta)));
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={onReset}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 32 : 16;
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          nudge(sign * -step);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          nudge(sign * step);
        } else if (event.key === 'Home') {
          event.preventDefault();
          onReset();
        }
      }}
      className={cn(
        'group absolute top-0 z-30 flex h-full w-3 cursor-col-resize touch-none items-center justify-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        edge === 'end' ? '-right-1.5' : '-left-1.5',
      )}
    >
      <span
        className={cn(
          'h-10 w-1 rounded-full bg-border transition-colors group-hover:bg-primary',
          dragging && 'bg-primary',
        )}
      />
    </div>
  );
}

/**
 * Shows a detail view: a side pane on desktop, a bottom sheet on phones.
 * On desktop the caller places it next to the list inside a flex row.
 */
export const DetailPane = ({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}) => {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const frameRef = useRef<HTMLElement>(null);
  const pane = usePaneWidth({
    storageKey: 'detail',
    fallback: 440,
    min: 320,
    max: 720,
    reserve: 280,
    frameRef,
    active: isDesktop && open,
  });
  if (isDesktop) {
    if (!open) return null;
    return (
      <aside
        ref={frameRef}
        style={{ width: pane.width }}
        className="relative flex min-w-0 shrink-0 flex-col border-l border-border bg-card"
      >
        <PaneResizeHandle
          label={t('common.resize-detail', { defaultValue: 'Resize detail' })!}
          edge="start"
          value={pane.width}
          min={pane.min}
          max={pane.max}
          onChange={pane.setWidth}
          onReset={pane.reset}
        />
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
          <div className="min-w-0 flex-1 truncate text-sm font-medium">
            {title}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('common.close', { defaultValue: 'Close' })!}
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </aside>
    );
  }
  return (
    <Sheet
      open={open}
      disablePointerDismissal
      onOpenChange={(next) => !next && onClose()}
    >
      <SheetContent
        side="bottom"
        className="flex max-h-[85dvh] flex-col gap-0 rounded-t-xl p-0 pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="border-b border-border px-4 py-3 pr-12">
          <SheetTitle className="truncate text-sm">{title}</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </SheetContent>
    </Sheet>
  );
};

/** Shared empty state for panels. */
export const PanelEmpty = ({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <Empty className="h-full border-0">
    <EmptyHeader>
      {icon && <EmptyMedia variant="icon">{icon}</EmptyMedia>}
      <EmptyTitle>{title}</EmptyTitle>
      {description && <EmptyDescription>{description}</EmptyDescription>}
    </EmptyHeader>
    {action}
  </Empty>
);
