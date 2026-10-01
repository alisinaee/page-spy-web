/**
 * Turns runtime console lines into a navigation trail.
 *
 * The Flutter app already prints these:
 * - GO_ROUTE: go, push, pop, replace, and the named forms
 * - STATE Wrote {...} to page.route (name, uri, path)
 * - Extracted json_ui from <url>
 * - Talker route observer: Open/Close route named …, DialogRoute, ModalBottomSheetRoute
 */

const OPERATIONS =
  'goNamed|pushReplacementNamed|pushReplacement|replaceNamed|popUntil|pushNamed|replace|push|pop|go';

const goPattern = new RegExp(
  `operation=(${OPERATIONS})(?:location=(\\S*))?(?: name=(.*?))?(?:query=|$)`,
);

const clean = (value) =>
  String(value || '')
    .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
    .trim();

const blank = (value) => {
  const text = clean(value);
  if (!text || text === 'null' || text === 'undefined') return '';
  return text;
};

const kindOf = (label) => {
  if (/dialog/i.test(label)) return 'dialog';
  if (/sheet|bottom/i.test(label)) return 'sheet';
  return 'page';
};

const isPageMove = (node) =>
  node.kind === 'page' &&
  node.operation !== 'close' &&
  node.operation !== 'pop';

export function buildRouteTrace(entries) {
  const nodes = [];
  let page = null;

  const absorb = (patch) => {
    const last = nodes[nodes.length - 1];
    const near =
      last &&
      patch.operation !== 'fill' &&
      patch.operation !== 'close' &&
      patch.operation !== 'pop' &&
      last.operation !== 'close' &&
      last.operation !== 'pop' &&
      Math.abs((last.time || 0) - (patch.time || 0)) < 1500 &&
      last.kind === (patch.kind || 'page') &&
      (!last.address || !patch.address || last.address === patch.address) &&
      (!last.name || !patch.name || last.name === patch.name);
    if (patch.operation === 'fill' && (page || last)) {
      const target = page || last;
      if (patch.name) target.name = patch.name;
      if (patch.address) target.address = patch.address;
      if (patch.jsonUrl) target.jsonUrl = patch.jsonUrl;
      return target;
    }
    if (near) {
      if (patch.name && !last.name) last.name = patch.name;
      if (patch.address && !last.address) last.address = patch.address;
      if (patch.jsonUrl) last.jsonUrl = patch.jsonUrl;
      if (patch.kind && patch.kind !== 'page') last.kind = patch.kind;
      if (patch.operation && last.operation === 'open')
        last.operation = patch.operation;
      if (
        patch.sourceIndex != null &&
        (last.sourceIndex == null || patch.sourceIndex < last.sourceIndex)
      ) {
        last.sourceIndex = patch.sourceIndex;
      }
      return last;
    }
    const node = {
      id: `route-${nodes.length}-${patch.time || 0}-${patch.sourceIndex || 0}`,
      time: patch.time || 0,
      operation: patch.operation || 'open',
      kind: patch.kind || 'page',
      name: patch.name || '',
      address: patch.address || '',
      jsonUrl: patch.jsonUrl || '',
      sourceIndex: patch.sourceIndex ?? 0,
    };
    nodes.push(node);
    return node;
  };

  const sorted = [...(entries || [])]
    .map((entry) => ({ ...entry, text: clean(entry.text) }))
    .filter((entry) => entry.text)
    .sort((a, b) => (a.time || 0) - (b.time || 0));

  sorted.forEach((entry) => {
    const text = entry.text;
    const marker = text.match(
      /\[ROUTE\]\x1f([^\x1f]*)\x1f([^\x1f]*)\x1f([^\x1f]*)\x1f([^\x1f]*)\x1f([^\x1f]*)\x1f(\d+)/,
    );
    if (marker) {
      const node = absorb({
        time: Number(marker[6]) || entry.time,
        operation: marker[1] || 'open',
        kind: marker[2] || 'page',
        name: marker[3],
        address: marker[4],
        jsonUrl: marker[5],
        sourceIndex: entry.index,
      });
      if (
        node.kind === 'page' &&
        node.operation !== 'pop' &&
        node.operation !== 'close'
      ) {
        page = node;
      }
      return;
    }
    const json = text.match(/Extracted json_ui from (\S+)/);
    if (json) {
      const url = json[1].replace(/[),.;]+$/, '');
      if (!page) {
        page = absorb({
          time: entry.time,
          operation: 'open',
          kind: 'page',
          jsonUrl: url,
          name: 'Page',
          sourceIndex: entry.index,
        });
      } else {
        const folded = url.toLowerCase().replace(/[^a-z0-9]+/g, '');
        const tokens = `${page.name} ${page.address}`
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((part) => part.length > 3);
        const hit = tokens.some((part) => folded.includes(part));
        if (!page.jsonUrl || hit) page.jsonUrl = url;
      }
      return;
    }

    if (text.includes('GO_ROUTE') || text.includes('operation=')) {
      const go = text.match(goPattern);
      if (
        go &&
        (text.includes('GO_ROUTE') ||
          text.includes('location=') ||
          text.includes('query='))
      ) {
        const operation = go[1];
        const address = blank(go[2]);
        const name = blank(go[3]);
        const node = absorb({
          time: entry.time,
          operation,
          kind: 'page',
          name,
          address,
          sourceIndex: entry.index,
        });
        if (operation !== 'pop' && operation !== 'popUntil') page = node;
        return;
      }
    }

    if (text.includes('to page.route') || text.includes('matchedLocation')) {
      const uri = blank((text.match(/\buri: ([^,}\n]+)/) || [])[1]);
      const path = blank((text.match(/\bpath: ([^,}\n]+)/) || [])[1]);
      const name = blank((text.match(/\bname: ([^,}\n]+)/) || [])[1]);
      const address = uri || path;
      if (!address && !name) return;
      const node = absorb({
        time: entry.time,
        operation: page ? 'fill' : 'open',
        kind: 'page',
        name,
        address,
        sourceIndex: entry.index,
      });
      page = node;
      return;
    }

    const nav = text.match(/\b(Open|Close)\s+(?:route named\s+)?([^\n]+)/);
    if (!nav) return;
    const operation = nav[1].toLowerCase() === 'close' ? 'close' : 'open';
    const label = nav[2].replace(/\s*Arguments:[\s\S]*$/, '').trim();
    const kind = kindOf(label);
    const node = absorb({
      time: entry.time,
      operation,
      kind,
      name: label.replace(/<[^>]*>/g, ''),
      sourceIndex: entry.index,
    });
    if (kind === 'page' && operation === 'open') page = node;
  });

  return nodes;
}

export function routeWindow(nodes, id) {
  const index = nodes.findIndex((node) => node.id === id);
  if (index < 0) {
    return {
      start: 0,
      end: Number.POSITIVE_INFINITY,
      startIndex: 0,
      endIndex: Number.POSITIVE_INFINITY,
    };
  }
  const node = nodes[index];
  let end = Number.POSITIVE_INFINITY;
  let endIndex = Number.POSITIVE_INFINITY;
  for (let i = index + 1; i < nodes.length; i += 1) {
    const next = nodes[i];
    const boundary =
      node.kind === 'page'
        ? isPageMove(next)
        : (next.sourceIndex ?? 0) > (node.sourceIndex ?? -1);
    if (!boundary) continue;
    if ((next.time || 0) > (node.time || 0)) end = next.time;
    if ((next.sourceIndex ?? 0) > (node.sourceIndex ?? -1)) {
      endIndex = next.sourceIndex;
      break;
    }
  }
  if (end <= (node.time || 0)) end = Number.POSITIVE_INFINITY;
  return {
    start: node.time || 0,
    end,
    startIndex: node.sourceIndex ?? 0,
    endIndex,
  };
}
