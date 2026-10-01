import React, { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ElementContent, Element } from 'hast';
import { camelCaseToKebabCase, replaceProperties } from './utils';
import { useSocketMessageStore } from '@/store/socket-message';
import { useAsyncEffect } from 'ahooks';
import sh from '@/utils/shiki-highlighter';
import type { Lang } from 'shiki';
import { isArray } from 'lodash-es';
import { useShallow } from 'zustand/react/shallow';

const tag2lang = {
  style: 'css',
  script: 'javascript',
} as const;

const getTextBlockLang = (parentNode: Element) => {
  const { tagName, children } = parentNode;
  if (['script', 'style'].includes(tagName)) {
    if (children && children.length === 1) {
      return tag2lang[tagName as keyof typeof tag2lang];
    }
  }
  return 'text';
};

function hasMembers(data: any) {
  return !!data && Object.keys(data).length > 0;
}

const ElementAttrs: React.FC<{ data?: Record<string, any> }> = ({
  data = {},
}) => {
  const attrs = useMemo(() => {
    if (!hasMembers(data)) return '';
    return Object.entries(data).map(([key, val]) => {
      const prop = camelCaseToKebabCase(replaceProperties(key));
      return (
        <span className="attrs-item text-muted-foreground" key={key}>
          {' '}
          <span className="attrs-item__name text-warning">{prop}</span>
          {!!val && (
            <>
              =&quot;
              <span className="attrs-item__value text-info">
                {isArray(val) ? val.join(' ') : val}
              </span>
              &quot;
            </>
          )}
        </span>
      );
    });
  }, [data]);
  return <span className="element-attrs">{attrs}</span>;
};

function ElementItem({
  ast,
  lang = 'text',
}: {
  ast: ElementContent;
  lang: string;
}) {
  const [spread, setSpread] = useState(false);
  const { type } = ast;

  const [textContent, setTextContent] = useState('');
  useAsyncEffect(async () => {
    if (type !== 'text') return;

    const { value } = ast;
    const content = value.trim();
    if (!content) {
      setTextContent('');
      return;
    }
    const highlighter = await sh.get({
      lang: lang as Lang,
      theme: 'github-dark',
    });
    const result = highlighter.codeToHtml(content, {
      lang,
      theme: 'github-dark',
    });
    setTextContent(result);
  }, [ast]);

  if (type === 'element') {
    const { tagName, properties, children } = ast as Element;

    return (
      <code className="element-item flex items-start justify-start">
        <div className="element-controller size-3.5">
          {children.length > 0 && (
            <button
              type="button"
              className="element-controller__btn p-0 bg-transparent border-0 cursor-pointer inline-flex items-center text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSpread(!spread);
              }}
              aria-label="Toggle element expansion"
            >
              <ChevronRight
                className={`size-3 transition-transform duration-150 ${
                  spread ? 'rotate-90' : ''
                }`}
              />
            </button>
          )}
        </div>
        <div className="element-content text-xs leading-[1.4] break-all [&_code]:text-xs">
          <span className="element-content__header text-muted-foreground">
            <span>&lt;</span>
            <span className="tag-name text-primary-text">{tagName}</span>
            <ElementAttrs data={properties} />
            <span>&gt;</span>
          </span>
          {children.length > 0 ? (
            <span className="element-content__body">
              {spread ? (
                <ElementNode ast={children} lang={getTextBlockLang(ast)} />
              ) : (
                '...'
              )}
            </span>
          ) : (
            ''
          )}
          <span className="element-content__footer text-muted-foreground">
            <span>&lt;</span>
            <span className="tag-name text-primary-text">/{tagName}</span>
            <span>&gt;</span>
          </span>
        </div>
      </code>
    );
  }
  if (type === 'text') {
    return (
      <div
        className="element-item plain-text ml-3.5 block whitespace-pre-wrap text-xs [&_pre]:m-0 [&_pre]:whitespace-pre-wrap [&_pre]:bg-transparent!"
        dangerouslySetInnerHTML={{ __html: textContent }}
      />
    );
  }

  if (type === 'comment') {
    return (
      <code className="element-item comment flex items-start justify-start translate-x-3.5 text-muted-foreground">{`<!-- ${ast.value} -->`}</code>
    );
  }
  return null;
}

function ElementNode({
  ast,
  lang = 'text',
}: {
  ast: ElementContent[];
  lang?: string;
}) {
  return (
    <div className="element-node">
      {ast.map((item, index) => {
        return (
          // eslint-disable-next-line react/no-array-index-key
          <ElementItem ast={item} lang={lang} key={index} />
        );
      })}
    </div>
  );
}

export const ElementPanel = memo(() => {
  const ast = useSocketMessageStore(useShallow((state) => state.pageMsg.tree));

  if (!ast) return null;
  return (
    <div className="element-panel">
      <ElementNode ast={ast} />
    </div>
  );
});
