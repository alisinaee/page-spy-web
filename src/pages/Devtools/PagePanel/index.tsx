import { useTranslation } from 'react-i18next';
import { PanelEmpty } from '@/components/panel';
import { useEffect, useRef, useState } from 'react';
import { PCFrame } from '../BrowserFrame';
import { useSocketMessageStore } from '@/store/socket-message';
import { useShallow } from 'zustand/react/shallow';
import { FileQuestion, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function insertStyle(doc: Document, text: string) {
  const style = doc.createElement('style');
  style.type = 'text/css';
  style.appendChild(doc.createTextNode(text));
  doc.head.appendChild(style);
}

const PagePanel = () => {
  const [html, refresh] = useSocketMessageStore(
    useShallow((state) => [state.pageMsg.html, state.refresh]),
  );
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const parser = useRef<DOMParser>(new DOMParser());
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (html) {
      const frameDocument = frameRef.current!.contentDocument;
      if (!frameDocument) return;

      const newDoc = parser.current.parseFromString(
        html.toString(),
        'text/html',
      );
      const htmlAttrs = Array.from(newDoc.documentElement.attributes);

      frameDocument.documentElement.innerHTML =
        newDoc.documentElement.innerHTML;
      htmlAttrs.forEach(({ name, value }) => {
        frameDocument.documentElement.setAttribute(name, value);
      });

      insertStyle(
        frameDocument!,
        `
        a {
          pointer-events: none;
        }
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
        }
        ::-webkit-scrollbar-thumb:active {
          background: rgba(255, 255, 255, 0.25);
        }
      `,
      );
      const frameBody = frameDocument!.querySelector('body');
      const stopClick = (event: Event) => {
        event.stopPropagation();
      };
      frameBody?.addEventListener('click', stopClick, true);

      const spyRoot = frameDocument?.querySelector(
        '#__pageSpy',
      ) as HTMLDivElement;
      if (spyRoot) {
        spyRoot.style.fontSize = `14px`;
      }
      setTimeout(() => {
        setLoading(false);
      }, 0);
      return () => {
        frameBody?.removeEventListener('click', stopClick, true);
      };
    }
  }, [html]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {!html ? (
        <PanelEmpty
          icon={<FileQuestion />}
          title={t('page.empty', { defaultValue: 'No page snapshot' })}
          action={
            <Button
              variant="outline"
              size="touch"
              className="md:h-9 md:min-h-0 md:text-sm"
              onClick={() => {
                setLoading(true);
                refresh('page');
              }}
            >
              <RotateCw />
              {t('common.refresh')}
            </Button>
          }
        />
      ) : (
        <PCFrame
          loading={loading}
          onRefresh={() => {
            setLoading(true);
            refresh('page');
          }}
        >
          <iframe
            className="client-iframe block border-0"
            ref={frameRef}
            width="100%"
            height="100%"
            sandbox="allow-same-origin"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </PCFrame>
      )}
    </div>
  );
};

export default PagePanel;
