import React from 'react';

export const BlockTitle = ({
  title,
  level = 3,
}: {
  title: React.ReactNode;
  level?: 1 | 2 | 3 | 4 | 5;
}) => {
  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
  return (
    <div className="block-title relative pl-4 before:absolute before:left-0 before:top-1/2 before:block before:h-3/5 before:w-1 before:-translate-y-1/2 before:bg-primary before:content-[''] [&~.block-title]:mt-8">
      <HeadingTag className="text-foreground/80 font-semibold tracking-tight my-2">
        {title}
      </HeadingTag>
    </div>
  );
};
