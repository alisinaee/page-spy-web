/* eslint-disable no-underscore-dangle */
import type { MouseEventHandler, ReactNode } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import './index.css';
import clsx from 'clsx';
import type { SpyAtom } from '@huolala-tech/page-spy-types';
import { LoadMore } from './LoadMore';
import { useSocketMessageStore } from '@/store/socket-message';
import { useDebugConfig } from '@/components/DebugConfigProvider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Trans } from 'react-i18next';
import CopyContent from '@/components/CopyContent';
import { useShallow } from 'zustand/react/shallow';
import { Link } from 'react-router-dom';
const CONSOLE_NODE = 'console-node mr-[7px] break-words text-xs leading-[18px]';
const TYPE_CLASS: Record<string, string> = {
  origin: 'text-foreground',
  number: 'text-info',
  string: 'text-warning',
  boolean: 'text-primary-text',
  symbol: 'text-warning',
  error: 'text-destructive',
  function: 'text-foreground',
  object: 'cursor-pointer whitespace-nowrap text-muted-foreground',
  null: 'text-muted-foreground',
  undefined: 'text-muted-foreground',
  bigint: 'text-success',
};

function isAtomNode(data: SpyAtom.Overview) {
  return data && data.type === 'atom' && data.__atomId !== undefined;
}

interface GetterNodeProps {
  id: string;
  parentId: string;
  instanceId: string;
  keyName: string;
}
function GetterNode({ id, parentId, instanceId, keyName }: GetterNodeProps) {
  const socket = useSocketMessageStore(useShallow((state) => state.socket));
  const [nodeData, setNodeData] = useState<SpyAtom.Overview>();

  useEffect(() => {
    if (socket) {
      socket.addListener(`atom-getter-${id}`, (data: SpyAtom.Overview) => {
        setNodeData(data);
      });
    }
    return () => {
      socket?.removeListener(`atom-getter-${id}`);
    };
  }, [id, keyName, socket]);

  const getPropertyValue: MouseEventHandler = useCallback(
    (evt) => {
      if (!id) return;
      evt.stopPropagation();
      if (socket) {
        socket.unicastMessage({
          type: 'atom-getter',
          data: {
            key: keyName,
            id,
            parentId,
            instanceId,
          },
        });
      }
    },
    [id, socket, keyName, parentId, instanceId],
  );

  if (nodeData) {
    return (
      <PropertyItem
        id={nodeData.__atomId || ''}
        keyName={keyName}
        propVal={nodeData}
      />
    );
  }

  return (
    <div className="atom-node">
      <code className="console-node mr-[7px] break-words text-xs leading-[18px]">
        <span
          className="property-key font-bold text-primary-text"
          style={{ fontStyle: 'normal' }}
        >
          {keyName}:{' '}
        </span>
        <span
          className="property-value ellipsis cursor-pointer not-italic hover:underline"
          onClick={getPropertyValue}
        >
          (...)
        </span>
      </code>
    </div>
  );
}

const PropertyItem = React.memo<{
  id: string;
  keyName: string;
  propVal: SpyAtom.Overview;
}>(({ id, keyName, propVal }) => {
  // 区分 getOwnPropertyDescriptors 和 手动添加的 [[Prototype]] / length 等属性
  if (isAtomNode(propVal)) {
    const { value: propertyContent } = propVal;
    let content = null;
    // 判断深层的对象
    if (typeof propertyContent === 'string') {
      content = (
        <>
          <span
            className="property-key font-bold text-primary-text"
            style={{ fontStyle: 'normal' }}
          >
            {keyName}:{' '}
          </span>
          <span className="property-value">
            <CopyContent content={propertyContent} />
          </span>
        </>
      );
    } else if (!propertyContent.value && propertyContent.get) {
      return (
        <GetterNode
          keyName={keyName}
          id={propVal.__atomId!}
          parentId={id}
          instanceId={propVal.instanceId!}
        />
      );
    } else {
      return (
        <div className="nested-console-node">
          <ConsoleNode
            data={{
              ...propertyContent.value,
              value: (
                <>
                  <span
                    className="property-key font-bold text-primary-text"
                    style={{ fontStyle: 'normal' }}
                  >
                    {keyName}:{' '}
                  </span>
                  <span className="property-value">
                    <CopyContent
                      content={String(propertyContent.value.value)}
                    />
                  </span>
                </>
              ),
            }}
          />
        </div>
      );
    }
    return <AtomNode id={propVal.__atomId!} value={content} />;
  }
  return (
    <div key={keyName}>
      <code>
        <span className="property-key font-bold text-primary-text">
          {keyName === '___proto___' ? '__proto__' : keyName}:{' '}
        </span>
        <span className="property-value">
          <ConsoleNode data={{ ...propVal }} />
        </span>
      </code>
    </div>
  );
});

const PrototypeKey = '[[Prototype]]';
interface AtomNodeProps {
  id: string;
  value: string | ReactNode;
  showArrow?: boolean;
}
function AtomNode({ id, value, showArrow = true }: AtomNodeProps) {
  const { offline } = useDebugConfig();
  const socket = useSocketMessageStore(useShallow((state) => state.socket));
  const [spread, setSpread] = useState(false);
  const [property, setProperty] = useState<Record<string, SpyAtom.Overview>>(
    {},
  );
  useEffect(() => {
    if (offline) return;
    if (socket) {
      socket.addListener(`atom-detail-${id}`, (data: any) => {
        setProperty(data);
      });
    }
    return () => {
      socket?.removeListener(`atom-detail-${id}`);
    };
  }, [socket, id, offline]);

  const PropertyPanel = useCallback(() => {
    let prototypeFlag = false;
    const propertyKeys = Object.keys(property).reduce<string[]>((acc, cur) => {
      if (cur === PrototypeKey) {
        prototypeFlag = true;
        return acc;
      }
      acc.push(cur);
      return acc;
    }, []);
    if (prototypeFlag) {
      propertyKeys.push(PrototypeKey);
    }
    if (propertyKeys.length === 0 || !spread) return null;

    return (
      <div className="property-panel">
        <LoadMore
          list={propertyKeys}
          render={(key) => (
            <PropertyItem
              key={key}
              id={id}
              keyName={key}
              propVal={property[key]}
            />
          )}
        />
      </div>
    );
  }, [id, property, spread]);

  const getAtomDetail = useCallback(() => {
    if (offline || !id) return;
    if (socket && Object.keys(property).length === 0) {
      socket.unicastMessage({
        type: 'atom-detail',
        data: id,
      });
    }
    setSpread(!spread);
  }, [offline, id, socket, property, spread]);

  const codeEl = (
    <code className={`${CONSOLE_NODE} atom`} onClick={getAtomDetail}>
      {showArrow && (
        <ChevronRight
          className={clsx([
            'spread-controller inline w-3 h-3 transition-transform duration-100 ease-linear',
            spread ? 'spread rotate-90' : 'rotate-0',
          ])}
        />
      )}
      <i>{value}</i>
    </code>
  );

  return (
    <div
      className={clsx('atom-node cursor-default', {
        'disabled cursor-not-allowed text-muted-foreground': offline,
      })}
    >
      {offline ? (
        <Tooltip>
          <TooltipTrigger render={codeEl} />
          <TooltipContent>
            <Trans i18nKey="replay.unsupport-spread">
              <p>
                Objects cannot be expanded by default. Set
                <Link
                  to="/docs/pagespy#config-serializeData"
                  target="_blank"
                  style={{
                    color: 'var(--popover-foreground)',
                    textDecoration: 'underline',
                    textUnderlineOffset: 4,
                  }}
                >
                  <code>serializeData: true</code>
                </Link>
                to enable.
              </p>
            </Trans>
          </TooltipContent>
        </Tooltip>
      ) : (
        codeEl
      )}
      <PropertyPanel />
    </div>
  );
}

interface ConsoleNodeProps {
  data: SpyAtom.Overview;
}
const ConsoleNode = React.memo<ConsoleNodeProps>(({ data }) => {
  const { __atomId = '', type, value } = data;
  if (type === 'atom' && !!__atomId) {
    return <AtomNode id={__atomId} value={value as string} />;
  }
  // new Boolean/String/Number...
  // e.g. new Boolean() => { type: 'object', value: false }
  if (type === 'object') {
    const superName = value.constructor.name;
    return (
      <code className={clsx(CONSOLE_NODE, TYPE_CLASS.object, 'object')}>
        <ChevronRight className="inline w-3 h-3" />
        <i>
          {`${superName} {`}
          <ConsoleNode
            data={{
              ...data,
              type: superName.toLowerCase() as SpyAtom.Overview['type'],
            }}
          />
          <span className="right-mustache -ml-1.5">{'}'}</span>
        </i>
      </code>
    );
  }

  let className: string = type;
  if (type === 'debug-origin') {
    className = 'origin';
  }

  let node: any;
  if (React.isValidElement(value)) {
    node = value;
  } else {
    node = String(value);
    if (type === 'function') {
      node = <i>{node}</i>;
    }
  }

  return (
    <code className={clsx(CONSOLE_NODE, TYPE_CLASS[className], className)}>
      {node || '""'}
    </code>
  );
});

export default ConsoleNode;
