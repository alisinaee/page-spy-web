import Docs from '@/components/Docs';

const sidebar = [
  {
    group: 'Guide',
    children: [
      {
        label: 'Introduction',
        doc: 'introduction',
      },
      {
        label: 'Customize Theme',
        doc: 'theme',
      },
      {
        label: 'FAQ',
        doc: 'faq',
      },
    ],
  },
];

const mdxComponents = import.meta.glob('./md/*.en.mdx');
const mdRawContents = import.meta.glob('./md/*.en.mdx', {
  import: 'default',
  query: '?raw',
}) as Record<string, () => Promise<string>>;

const OSpyDocs = () => {
  return <Docs {...{ sidebar, mdxComponents, mdRawContents }} />;
};

export default OSpyDocs;
