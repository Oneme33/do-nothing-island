import { mkdir, copyFile, cp, rm, readFile, writeFile, readdir } from 'node:fs/promises';
await rm('dist', { recursive:true, force:true });
await mkdir('dist', { recursive:true });
for (const file of ['index.html','styles.css','favicon.svg']) await copyFile(file,`dist/${file}`);
await cp('src','dist/src',{recursive:true});
// A self-contained entry point also runs directly from disk, without a server.
const sources = await Promise.all(['language','family','wishes','challenges','finale','inspection','consequences','spectacle','story','coast','collection','away','square','river','identity','commissions','delights','monuments','weather','visitors','islets','famous','medieval','hazards','simulation','chronicle','museum','tour','credits','postcard','feel','pageants','daylight','sea','fx','animals','ambient','festive','weatherfx','sound','renderer','album','app'].map(name=>readFile(`src/${name}.js`,'utf8')));
const script = sources.map(source=>source.replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')).join('\n');
const css = await readFile('styles.css','utf8');
const html = (await readFile('index.html','utf8'))
  .replace('<link rel="stylesheet" href="./styles.css">',()=>`<style>${css}</style>`)
  .replace('<script type="module" src="./src/app.js"></script>',()=>`<script>(()=>{\n${script}\n})();</script>`);
await writeFile('start.html',html);
await writeFile('dist/start.html',html);
// Every build stamps its module URLs with a version, so a new upload is fetched fresh while unchanged builds stay cached.
const stamp=Date.now().toString(36);
for(const name of (await readdir('dist/src')).filter(n=>n.endsWith('.js'))){const file=`dist/src/${name}`;await writeFile(file,(await readFile(file,'utf8')).replace(/from '\.\/([\w-]+)\.js'/g,(m,n)=>`from './${n}.js?v=${stamp}'`));}
await writeFile('dist/index.html',(await readFile('dist/index.html','utf8')).replace('./src/app.js','./src/app.js?v='+stamp).replace('./styles.css','./styles.css?v='+stamp));
console.log('Built Do Nothing Island → dist/ (no runtime dependencies)');
