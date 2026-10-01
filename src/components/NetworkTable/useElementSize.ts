import { useCallback, useRef, useState } from 'react';

/** Measures an element so react-window gets a fixed width/height. */
export const useElementSize = () => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observer = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node) return;
    const update = () =>
      setSize((prev) =>
        prev.width === node.clientWidth && prev.height === node.clientHeight
          ? prev
          : { width: node.clientWidth, height: node.clientHeight },
      );
    update();
    observer.current = new ResizeObserver(update);
    observer.current.observe(node);
  }, []);

  return [ref, size] as const;
};
