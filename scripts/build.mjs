import { mkdir, copyFile, cp, rm, readFile, writeFile } from 'node:fs/promises';
await rm('dist', { recursive:true, force:true });
await mkdir('dist', { recursive:true });
for (const file of ['index.html','styles.css','favicon.svg']) await copyFile(file,`dist/${file}`);
await cp('src','dist/src',{recursive:true});
// A self-contained entry point also runs directly from disk, without a server.
const sources = await Promise.all(['language','family','wishes','challenges','finale','inspection','consequences','spectacle','story','simulation','pageants','renderer','app'].map(name=>readFile(`src/${name}.js`,'utf8')));
const script = sources.map(source=>source.replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')).join('\n');
const css = await readFile('styles.css','utf8');
const html = (await readFile('index.html','utf8'))
  .replace('<link rel="stylesheet" href="./styles.css">',()=>`<style>${css}</style>`)
  .replace('<script type="module" src="./src/app.js"></script>',()=>`<script>(()=>{\n${script}\n})();</script>`);
await writeFile('start.html',html);
await writeFile('dist/start.html',html);
console.log('Built Do Nothing Island → dist/ (no runtime dependencies)');
