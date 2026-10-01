import { useMemo } from 'react';

const deepen = (value: unknown, depth = 0): unknown => {
  if (depth > 6 || value === null || value === undefined) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('{') || trimmed.startsWith('[')) &&
      trimmed.length > 1
    ) {
      try {
        return deepen(JSON.parse(trimmed), depth + 1);
      } catch (error) {
        return value;
      }
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => deepen(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        deepen(item, depth + 1),
      ]),
    );
  }
  return value;
};

const MAX_TOKENS = 5000;

interface TokenCounter {
  count: number;
  id: number;
  truncated: boolean;
}

const TOKEN_CLASS: Record<string, string> = {
  key: 'text-primary-text',
  str: 'text-success',
  num: 'text-info',
  bool: 'text-warning',
  nil: 'text-muted-foreground',
  punct: 'text-foreground',
};

const token = (text: string, kind: string, counter: TokenCounter) => {
  counter.count += 1;
  counter.id += 1;
  return (
    <span className={`j-${kind} ${TOKEN_CLASS[kind] ?? ''}`} key={counter.id}>
      {text}
    </span>
  );
};

const writeJson = (
  value: unknown,
  indent: number,
  counter: TokenCounter,
): JSX.Element[] => {
  if (counter.count >= MAX_TOKENS) {
    if (!counter.truncated) {
      counter.truncated = true;
      return [token('… (truncated)', 'punct', counter)];
    }
    return [];
  }
  const pad = '  '.repeat(indent);
  if (value === null) return [token('null', 'nil', counter)];
  if (typeof value === 'boolean')
    return [token(String(value), 'bool', counter)];
  if (typeof value === 'number') return [token(String(value), 'num', counter)];
  if (typeof value === 'string')
    return [token(JSON.stringify(value), 'str', counter)];
  if (Array.isArray(value)) {
    if (!value.length) return [token('[]', 'punct', counter)];
    const nodes = [token('[\n', 'punct', counter)];
    for (const [index, item] of value.entries()) {
      if (counter.count >= MAX_TOKENS) {
        nodes.push(token('… (truncated)\n', 'punct', counter));
        counter.truncated = true;
        break;
      }
      nodes.push(token(pad + '  ', 'punct', counter));
      const child = writeJson(item, indent + 1, counter);
      for (const node of child) nodes.push(node);
      nodes.push(
        token(index === value.length - 1 ? '\n' : ',\n', 'punct', counter),
      );
    }
    if (!counter.truncated) nodes.push(token(pad + ']', 'punct', counter));
    return nodes;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) return [token('{}', 'punct', counter)];
  const nodes = [token('{\n', 'punct', counter)];
  for (const [index, entry] of entries.entries()) {
    if (counter.count >= MAX_TOKENS) {
      nodes.push(token('… (truncated)\n', 'punct', counter));
      counter.truncated = true;
      break;
    }
    const [key, item] = entry;
    nodes.push(token(pad + '  ', 'punct', counter));
    nodes.push(token(JSON.stringify(key), 'key', counter));
    nodes.push(token(': ', 'punct', counter));
    const child = writeJson(item, indent + 1, counter);
    for (const node of child) nodes.push(node);
    nodes.push(
      token(index === entries.length - 1 ? '\n' : ',\n', 'punct', counter),
    );
  }
  if (!counter.truncated) nodes.push(token(pad + '}', 'punct', counter));
  return nodes;
};

export const ColoredJson = ({ value }: { value: unknown }) => {
  const nodes = useMemo(() => {
    const counter: TokenCounter = { count: 0, id: 0, truncated: false };
    if (value === null || value === undefined || value === '')
      return [token('None', 'nil', counter)];
    return writeJson(deepen(value), 0, counter);
  }, [value]);

  return (
    <pre className="colored-json m-2 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-card p-3 font-mono text-xs leading-normal text-foreground">
      {nodes}
    </pre>
  );
};
