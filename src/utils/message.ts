import { toast } from '@/components/ui/toast';
import type { ReactNode } from 'react';

export type MessageInput =
  | ReactNode
  | { content: ReactNode; key?: string; duration?: number }
  | any;

function extractContent(input: MessageInput): {
  title?: string;
  description?: ReactNode;
  timeout?: number;
  id?: string;
} {
  if (
    input &&
    typeof input === 'object' &&
    'content' in (input as Record<string, unknown>)
  ) {
    const obj = input as {
      content: ReactNode;
      key?: string;
      duration?: number;
    };
    const content = obj.content;
    return {
      title: typeof content === 'string' ? content : undefined,
      description: typeof content !== 'string' ? content : undefined,
      timeout: obj.duration,
      id: obj.key,
    };
  }
  return {
    title: typeof input === 'string' ? input : undefined,
    description: typeof input !== 'string' ? (input as ReactNode) : undefined,
  };
}

const activeKeyMap = new Map<string, string>();
const activeIds = new Set<string>();

export const message = {
  success: (input: MessageInput, duration = 3000) => {
    const { title, description, timeout: d, id: key } = extractContent(input);
    if (key && activeKeyMap.has(key)) {
      toast.close(activeKeyMap.get(key)!);
    }
    const id = toast.add({
      title,
      description,
      type: 'success',
      timeout: d ?? duration,
    });
    if (key) activeKeyMap.set(key, id);
    activeIds.add(id);
    return id;
  },
  error: (input: MessageInput, duration = 4000) => {
    const { title, description, timeout: d, id: key } = extractContent(input);
    if (key && activeKeyMap.has(key)) {
      toast.close(activeKeyMap.get(key)!);
    }
    const id = toast.add({
      title,
      description,
      type: 'error',
      timeout: d ?? duration,
    });
    if (key) activeKeyMap.set(key, id);
    activeIds.add(id);
    return id;
  },
  info: (input: MessageInput, duration = 3000) => {
    const { title, description, timeout: d, id: key } = extractContent(input);
    if (key && activeKeyMap.has(key)) {
      toast.close(activeKeyMap.get(key)!);
    }
    const id = toast.add({
      title,
      description,
      type: 'info',
      timeout: d ?? duration,
    });
    if (key) activeKeyMap.set(key, id);
    activeIds.add(id);
    return id;
  },
  warning: (input: MessageInput, duration = 3500) => {
    const { title, description, timeout: d, id: key } = extractContent(input);
    if (key && activeKeyMap.has(key)) {
      toast.close(activeKeyMap.get(key)!);
    }
    const id = toast.add({
      title,
      description,
      type: 'warning',
      timeout: d ?? duration,
    });
    if (key) activeKeyMap.set(key, id);
    activeIds.add(id);
    return id;
  },
  loading: (input: MessageInput, duration = 0) => {
    const { title, description, timeout: d, id: key } = extractContent(input);
    if (key && activeKeyMap.has(key)) {
      toast.close(activeKeyMap.get(key)!);
    }
    const id = toast.add({
      title,
      description,
      type: 'loading',
      timeout: d ?? duration,
    });
    if (key) activeKeyMap.set(key, id);
    activeIds.add(id);
    return id;
  },
  destroy: (key?: string) => {
    if (key) {
      const id = activeKeyMap.get(key);
      if (id) {
        toast.close(id);
        activeKeyMap.delete(key);
        activeIds.delete(id);
      }
    } else {
      activeIds.forEach((id) => toast.close(id));
      activeIds.clear();
      activeKeyMap.clear();
    }
  },
  useMessage: () => {
    return [
      {
        success: message.success,
        error: message.error,
        info: message.info,
        warning: message.warning,
        loading: message.loading,
        open: (config: {
          type?: string;
          content: ReactNode;
          duration?: number;
          key?: string;
        }) => {
          const fn = (message as any)[config.type || 'info'] || message.info;
          return fn(config.content, (config.duration ?? 3) * 1000);
        },
        destroy: message.destroy,
      },
      null, // contextHolder placeholder
    ] as const;
  },
};

export const notification = {
  success: (config: {
    message: ReactNode;
    description?: ReactNode;
    duration?: number;
    key?: string;
  }) => {
    if (config.key && activeKeyMap.has(config.key)) {
      toast.close(activeKeyMap.get(config.key)!);
    }
    const id = toast.add({
      title: typeof config.message === 'string' ? config.message : undefined,
      description:
        config.description ??
        (typeof config.message !== 'string' ? config.message : undefined),
      type: 'success',
      timeout: config.duration !== undefined ? config.duration * 1000 : 4500,
    });
    if (config.key) activeKeyMap.set(config.key, id);
    activeIds.add(id);
    return id;
  },
  error: (config: {
    message: ReactNode;
    description?: ReactNode;
    duration?: number;
    key?: string;
  }) => {
    if (config.key && activeKeyMap.has(config.key)) {
      toast.close(activeKeyMap.get(config.key)!);
    }
    const id = toast.add({
      title: typeof config.message === 'string' ? config.message : undefined,
      description:
        config.description ??
        (typeof config.message !== 'string' ? config.message : undefined),
      type: 'error',
      timeout: config.duration !== undefined ? config.duration * 1000 : 4500,
    });
    if (config.key) activeKeyMap.set(config.key, id);
    activeIds.add(id);
    return id;
  },
  info: (config: {
    message: ReactNode;
    description?: ReactNode;
    duration?: number;
    key?: string;
  }) => {
    if (config.key && activeKeyMap.has(config.key)) {
      toast.close(activeKeyMap.get(config.key)!);
    }
    const id = toast.add({
      title: typeof config.message === 'string' ? config.message : undefined,
      description:
        config.description ??
        (typeof config.message !== 'string' ? config.message : undefined),
      type: 'info',
      timeout: config.duration !== undefined ? config.duration * 1000 : 4500,
    });
    if (config.key) activeKeyMap.set(config.key, id);
    activeIds.add(id);
    return id;
  },
  warning: (config: {
    message: ReactNode;
    description?: ReactNode;
    duration?: number;
    key?: string;
  }) => {
    if (config.key && activeKeyMap.has(config.key)) {
      toast.close(activeKeyMap.get(config.key)!);
    }
    const id = toast.add({
      title: typeof config.message === 'string' ? config.message : undefined,
      description:
        config.description ??
        (typeof config.message !== 'string' ? config.message : undefined),
      type: 'warning',
      timeout: config.duration !== undefined ? config.duration * 1000 : 4500,
    });
    if (config.key) activeKeyMap.set(config.key, id);
    activeIds.add(id);
    return id;
  },
  destroy: (key?: string) => {
    message.destroy(key);
  },
};
