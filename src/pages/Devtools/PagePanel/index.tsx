import { SectionLogActions } from '../SectionLogActions';
import { useEffect, useRef, useState } from 'react';
import { PCFrame } from '../BrowserFrame';
import './index.less';
import { useSocketMessageStore } from '@/store/socket-message';
import { useShallow } from 'zustand/react/shallow';
import { FileQuestion } from 'lucide-react';

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
          background: rgba(0, 0, 0, 0.15);
        }
        ::-webkit-scrollbar-thumb:active {
          background: rgba(0, 0, 0, 0.25);
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
    <div className="page-panel flex flex-col h-full">
      <div className="flex justify-end p-1.5 border-b border-border/40">
        <SectionLogActions section="page" />
      </div>
      <div className="page-panel__content flex-1 min-h-0">
        {!html ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <FileQuestion className="size-10 opacity-30" />
            <span className="text-xs">No page snapshot</span>
          </div>
        ) : (
          <PCFrame
            loading={loading}
            onRefresh={() => {
              setLoading(true);
              refresh('page');
            }}
          >
            <iframe
              className="client-iframe"
              ref={frameRef}
              width="100%"
              height="100%"
              sandbox="allow-same-origin"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </PCFrame>
        )}
      </div>
    </div>
  );
};

export default PagePanel;
