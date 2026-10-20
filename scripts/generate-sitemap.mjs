import fs from 'node:fs';
import path from 'node:path';

const origin = 'https://saladin.su';
const publicDir = path.resolve('public');
const articleDir = path.join(publicDir, 'articles');
const urls = ['/', '/cat/'];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

for (const file of walk(articleDir).filter((file) => file.endsWith('.html'))) {
  const relative = path.relative(publicDir, file).split(path.sep).join('/');
  const route = relative.endsWith('/index.html')
    ? `/${relative.slice(0, -'index.html'.length)}`
    : `/${relative}`;
  urls.push(route);
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((route) => `  <url><loc>${origin}${route}</loc></url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml);
console.log(`sitemap: ${urls.length} URL${urls.length === 1 ? '' : 's'}`);
