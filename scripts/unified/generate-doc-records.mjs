/**
 * @import {Root} from 'hast'
 */
import fs from 'node:fs';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { visit } from 'unist-util-visit';
import { toString } from 'hast-util-to-string';
import { remarkMdxCodeGroup } from './custom-plugin.mjs';
import { formatSlug } from './utils.mjs';
import { mergeWith } from 'lodash-es';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
const root = process.cwd();
const outputDir = path.join(root, 'src/assets');
// /docs/<filename>#<title>
const mainDocDir = path.join(root, 'src/pages/MainDocs/md');
const mainDocFiles = fs
  .readdirSync(mainDocDir, 'utf-8')
  .filter((file) => file.endsWith('.en.mdx'));
const mainDocMenus = new Map([
  ['introduction', 'Introduction'],
  ['deploy-guide', 'Guide'],
  ['deploy-with-node', 'Deploy with Node'],
  ['deploy-with-docker', 'Deploy with Docker'],
  ['deploy-with-baota', 'Deploy with Baota'],
  ['server-configuration', 'Server Configuration'],
  ['browser', 'Browser'],
  ['miniprogram', 'Miniprogram'],
  ['react-native', 'React Native'],
  ['harmony', 'Harmony App'],
  ['lynx', 'Lynx'],
  ['api', 'API'],
  ['pagespy', 'Pagespy'],
  ['data-harbor', 'DataHarborPlugin'],
  ['rrweb', 'RRWebPlugin'],
  ['offline-log', 'Offline Log'],
  ['faq', 'FAQ'],
  ['plugins', 'Plugins'],
  ['changelog', 'Changelog'],
]);

// /o-spy/docs/<filename>#<title>
const oSpyDocDir = path.join(root, 'src/pages/OSpyDocs/md');
const oSpyDocFiles = fs
  .readdirSync(oSpyDocDir, 'utf-8')
  .filter((file) => file.endsWith('.en.mdx'));
const oSpyDocMenus = new Map([
  ['introduction', 'Introduction'],
  ['theme', 'Customize Theme'],
  ['faq', 'FAQ'],
]);

async function computeDocRecords({ files, baseDir, menus, baseRoute }) {
  const result = {
    en: [],
  };
  await Promise.all(
    files.map(async (file) => {
      // if (!file.includes('pagespy.zh')) return
      const [, filename, language] = file.match(/^(.+)\.(en)\.mdx$/);
      if (!language) {
        throw new Error(file);
      }
      const content = fs.readFileSync(path.join(baseDir, file), 'utf-8');
      const label = menus.get(filename);
      if (!label) {
        throw new Error(`${filename} not found in menus`);
      }
      const parent = typeof label === 'string' ? label : null;

      let part;
      const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkDirective)
        .use(remarkMdxCodeGroup)
        .use(remarkRehype)
        .use(() => (tree) => {
          visit(tree, 'root', (root) => {
            root.children.forEach((node) => {
              if (node.type === 'element') {
                if (/h\d/.test(node.tagName)) {
                  let slug = '';
                  const customSlug = node.children.findLast(
                    (child) =>
                      child.type === 'text' && child.value.includes('#'),
                  );
                  if (!customSlug) {
                    slug = node.children.find(
                      (child) => child.type === 'text',
                    )?.value;
                  } else {
                    slug = customSlug.value.split('#')[1];
                  }
                  part = {
                    language,
                    route: `${baseRoute}/${filename}#${formatSlug(slug)}`,
                    parent,
                    title: toString(node).replace(/#.+/, ''),
                    content: '',
                  };

                  result[language].push(part);
                } else {
                  if (!part) {
                    // 左侧菜单的一级标题都是运行时自动插入的，所以这里手动插入一个标题
                    part = {
                      language,
                      route: `${baseRoute}/${filename}#${filename}`,
                      parent,
                      title: parent,
                      content: '',
                    };
                    result[language].push(part);
                  }
                  part.content += toString(node).replace(/\n+/g, ' ');
                }
              }
            });
          });
        });
      const tree = processor.parse(content);
      await processor.run(tree);
    }),
  );
  return result;
}

try {
  const mainDocResult = await computeDocRecords({
    files: mainDocFiles,
    baseDir: mainDocDir,
    menus: mainDocMenus,
    baseRoute: '/docs',
  });
  const oSpyDocResult = await computeDocRecords({
    files: oSpyDocFiles,
    baseDir: oSpyDocDir,
    menus: oSpyDocMenus,
    baseRoute: '/o-spy/docs',
  });

  const result = mergeWith(mainDocResult, oSpyDocResult, (a, b) => {
    return a.concat(b);
  });

  // console.log(result);

  fs.writeFileSync(
    path.join(outputDir, 'docs.json'),
    JSON.stringify(result, null, 2),
  );
  console.log('🟢 The ./src/assets/docs.json doc records generated.');
} catch (e) {
  console.error(`🔴 Error: ${e.message}`);
}
