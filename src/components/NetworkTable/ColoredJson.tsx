import { useMemo } from 'react';

const deepen = (value: unknown, depth = 0): unknown => {
  if (depth > 6 || value == null) return value;
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

let tokenId = 0;

const token = (text: string, kind: string) => (
  <span className={'j-' + kind} key={(tokenId += 1)}>
    {text}
  </span>
);

const writeJson = (value: unknown, indent: number): JSX.Element[] => {
  const pad = '  '.repeat(indent);
  if (value === null) return [token('null', 'nil')];
  if (typeof value === 'boolean') return [token(String(value), 'bool')];
  if (typeof value === 'number') return [token(String(value), 'num')];
  if (typeof value === 'string') return [token(JSON.stringify(value), 'str')];
  if (Array.isArray(value)) {
    if (!value.length) return [token('[]', 'punct')];
    const nodes = [token('[\n', 'punct')];
    value.forEach((item, index) => {
      nodes.push(token(pad + '  ', 'punct'));
      nodes.push(...writeJson(item, indent + 1));
      nodes.push(token(index === value.length - 1 ? '\n' : ',\n', 'punct'));
    });
    nodes.push(token(pad + ']', 'punct'));
    return nodes;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) return [token('{}', 'punct')];
  const nodes = [token('{\n', 'punct')];
  entries.forEach(([key, item], index) => {
    nodes.push(token(pad + '  ', 'punct'));
    nodes.push(token(JSON.stringify(key), 'key'));
    nodes.push(token(': ', 'punct'));
    nodes.push(...writeJson(item, indent + 1));
    nodes.push(token(index === entries.length - 1 ? '\n' : ',\n', 'punct'));
  });
  nodes.push(token(pad + '}', 'punct'));
  return nodes;
};

export const ColoredJson = ({ value }: { value: unknown }) => {
  const nodes = useMemo(() => {
    tokenId = 0;
    if (value == null || value === '') return [token('None', 'nil')];
    return writeJson(deepen(value), 0);
  }, [value]);

  return <pre className="colored-json">{nodes}</pre>;
};
