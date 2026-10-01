import React from 'react';
import './index.less';

export const BlockTitle = ({
  title,
  level = 3,
}: {
  title: React.ReactNode;
  level?: 1 | 2 | 3 | 4 | 5;
}) => {
  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
  return (
    <div className="block-title">
      <HeadingTag className="text-foreground/80 font-semibold tracking-tight my-2">
        {title}
      </HeadingTag>
    </div>
  );
};
