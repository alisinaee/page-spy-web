import Docs from '@/components/Docs';

const sidebar = [
  {
    group: 'Guide',
    children: [
      {
        label: 'Introduction',
        doc: 'introduction',
      },
    ],
  },
  {
    group: 'Deploy',
    children: [
      {
        label: 'Guide',
        doc: 'deploy-guide',
      },
      {
        label: 'Deploy with Node',
        doc: 'deploy-with-node',
      },
      {
        label: 'Deploy with Docker',
        doc: 'deploy-with-docker',
      },
      // {
      //   label: {
      //     zh: '使用 宝塔 部署',
      //     en: 'Deploy with Baota',
      //     ja: '宝塔を使用してデプロイ',
      //     ko: 'Baota로 배포',
      //   },
      //   doc: 'deploy-with-baota',
      // },
      {
        label: 'Server Configuration',
        doc: 'server-configuration',
      },
      // {
      //   label: {
      //     zh: '使用 1Panel 部署',
      //     en: 'Deploy with 1Panel',
      //     ja: '1Panel を使用してデプロイ',
      //     ko: '1Panel로 배포',
      //   },
      //   doc: 'deploy-with-1panel',
      // },
    ],
  },
  {
    group: 'Quick Start',
    children: [
      {
        label: 'Browser',
        doc: 'browser',
      },
      {
        label: 'Miniprogram',
        doc: 'miniprogram',
      },
      {
        label: 'React Native',
        doc: 'react-native',
      },
      {
        label: 'Harmony App',
        doc: 'harmony',
      },
      {
        label: 'Lynx',
        doc: 'lynx',
      },
    ],
  },
  {
    group: 'About',
    children: [
      {
        label: 'API',
        doc: 'api',
      },
      {
        label: 'Offline Log',
        doc: 'offline-log',
      },
      {
        label: 'FAQ',
        doc: 'faq',
      },
      {
        label: 'Plugins',
        doc: 'plugins',
      },
      {
        label: 'Changelog',
        doc: 'changelog',
      },
    ],
  },
];

const mdxComponents = import.meta.glob('./md/*.en.mdx');
const mdRawContents = import.meta.glob('./md/*.en.mdx', {
  import: 'default',
  query: '?raw',
}) as Record<string, () => Promise<string>>;

const MainDocs = () => {
  return <Docs {...{ sidebar, mdxComponents, mdRawContents }} />;
};

export default MainDocs;
