import { readFile, writeFile, mkdir, cp, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {renderSite, imagePath} from './render.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFile(path.join(root,file),'utf8');
const courses = JSON.parse(await read('data/courses.json'));
const site = JSON.parse(await read('data/site.json'));
const html = renderSite(await read('src/index.html'), courses, site);
for (const course of courses.filter(c=>c.visible && c.image)) await access(path.join(root,imagePath(course.image)));
await mkdir(path.join(root,'dist/assets'),{recursive:true});
await writeFile(path.join(root,'dist/index.html'), html);
await writeFile(path.join(root,'dist/.nojekyll'),'');
await cp(path.join(root,'src/site.js'),path.join(root,'dist/assets/site.js'));
await cp(path.join(root,'admin'),path.join(root,'dist/admin'),{recursive:true});
await cp(path.join(root,'media'),path.join(root,'dist/media'),{recursive:true});
console.log(`Сайт собран: ${courses.filter(c=>c.visible).length} занятий. dist/index.html`);
