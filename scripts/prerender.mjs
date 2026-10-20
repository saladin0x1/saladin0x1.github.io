import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';

const ssrDir = path.resolve('.ssr');
const entry = path.join(ssrDir, 'main.js');
const htmlPath = path.resolve('dist/index.html');

if (!fs.existsSync(entry)) throw new Error(`SSR entry missing: ${entry}`);
if (!fs.existsSync(htmlPath)) throw new Error(`Client HTML missing: ${htmlPath}`);

const { App } = await import(`${pathToFileURL(entry).href}?t=${Date.now()}`);
const appHtml = renderToString(React.createElement(App));
const html = fs.readFileSync(htmlPath, 'utf8');
const mount = '<div id="root"></div>';

if (!html.includes(mount)) throw new Error('Could not find the root mount in dist/index.html');
fs.writeFileSync(htmlPath, html.replace(mount, `<div id="root">${appHtml}</div>`));
fs.rmSync(ssrDir, { recursive: true, force: true });
console.log(`prerender: ${appHtml.length.toLocaleString()} bytes of crawlable HTML`);
