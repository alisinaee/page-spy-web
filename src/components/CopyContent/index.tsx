import { message } from '@/utils/message';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Copy } from 'lucide-react';
import { Fragment, useCallback, useMemo } from 'react';
import copy from 'copy-to-clipboard';
import React from 'react';

interface Props {
  content: string;
  rows?: number;
  length?: number;
}

const CopyContent: React.FC<Props> = ({ content, rows = 3, length = 120 }) => {
  const computedContent = useMemo(() => {
    if (typeof content !== 'string') return content;
    const paragraph = content.split('\n');
    if (paragraph.length > rows) {
      return `${paragraph.slice(0, rows).join('\n')} ...`;
    }
    if (content.length > length) {
      return `${content.slice(0, length)}...`;
    }
    return content;
  }, [content, length, rows]);

  const onCopy = useCallback(() => {
    const copyResult = copy(`${content}`);
    if (copyResult) {
      message.success('Copy success');
    } else {
      message.error('Copy failed');
    }
  }, [content]);

  if (computedContent === content)
    return React.createElement(Fragment, null, content);

  return (
    <span className="copyable inline-flex items-center gap-1">
      <span className="copyable-content hover:bg-muted">{computedContent}</span>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="copyable-icon ml-2 inline-flex cursor-pointer items-center text-primary-text hover:text-foreground"
              onClick={onCopy}
              aria-label="Copy"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          }
        />
        <TooltipContent>Copy</TooltipContent>
      </Tooltip>
    </span>
  );
};

export default CopyContent;
