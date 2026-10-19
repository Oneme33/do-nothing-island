import {writeFile,mkdir} from 'node:fs/promises';
import {Civilization} from '../src/simulation.js';
import {startCinema} from '../src/spectacle.js';
import {IslandRenderer} from '../src/renderer.js';
import {drawFinale} from '../src/finale.js';
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function recorder(width,height){
 let shapes=[],path=[],state={matrix:[1,0,0,1,0,0],fillStyle:'#000000',strokeStyle:'#000000',globalAlpha:1,lineWidth:1,font:'10px sans-serif',textAlign:'left'},stack=[],gradients=[];
 const matrix=()=>`matrix(${state.matrix.join(' ')})`,multiply=(b)=>{const a=state.matrix;state.matrix=[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];};
 const paint=(kind,style,stroke=false)=>shapes.push(`<${kind} transform="${matrix()}" opacity="${state.globalAlpha}" fill="${stroke?'none':escape(style)}"${stroke?` stroke="${escape(style)}" stroke-width="${state.lineWidth}" stroke-linecap="round" stroke-linejoin="round"`:''}/>`);
 const drawPath=stroke=>{let d='';for(const p of path){if(typeof p==='string')d+=p;else{paint(`ellipse cx="${p.x}" cy="${p.y}" rx="${p.rx}" ry="${p.ry}"`,stroke?state.strokeStyle:state.fillStyle,stroke);}}if(d)paint(`path d="${d}"`,stroke?state.strokeStyle:state.fillStyle,stroke);};
 const ctx=new Proxy({
  setTransform:(...m)=>state.matrix=m,save:()=>stack.push({...state,matrix:[...state.matrix]}),restore:()=>state=stack.pop()||state,
  translate:(x,y)=>multiply([1,0,0,1,x,y]),scale:(x,y)=>multiply([x,0,0,y,0,0]),rotate:a=>multiply([Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]),
  beginPath:()=>path=[],closePath:()=>path.push('Z'),moveTo:(x,y)=>path.push(`M${x},${y}`),lineTo:(x,y)=>path.push(`L${x},${y}`),
  bezierCurveTo:(...a)=>path.push(`C${a.join(',')}`),quadraticCurveTo:(...a)=>path.push(`Q${a.join(',')}`),ellipse:(x,y,rx,ry)=>path.push({x,y,rx,ry}),
  fill:()=>drawPath(false),stroke:()=>drawPath(true),clearRect:()=>shapes=[],fillRect:(x,y,w,h)=>paint(`rect x="${x}" y="${y}" width="${w}" height="${h}"`,state.fillStyle),
  fillText:(text,x,y)=>shapes.push(`<text x="${x}" y="${y}" transform="${matrix()}" fill="${escape(state.fillStyle)}" opacity="${state.globalAlpha}" font-family="Georgia,serif" font-size="${parseFloat(state.font.match(/([\d.]+)px/)?.[1]||'10')}" text-anchor="${state.textAlign==='center'?'middle':state.textAlign==='right'?'end':'start'}">${escape(text)}</text>`),
  measureText:text=>({width:text.length*5.5}),createRadialGradient:(x,y,r,cx,cy,cr)=>{const id='gradient'+gradients.length,stops=[];gradients.push({id,cx,cy,r:cr,stops});return{addColorStop:(offset,color)=>stops.push({offset,color}),toString:()=>`url(#${id})`};}
 },{get:(t,k)=>k in t?t[k]:state[k],set:(t,k,v)=>(state[k]=v,true)});
 return {canvas:{getContext:()=>ctx,getBoundingClientRect:()=>({width,height})},svg:()=>`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${gradients.map(g=>`<radialGradient id="${g.id}" gradientUnits="userSpaceOnUse" cx="${g.cx}" cy="${g.cy}" r="${g.r}">${g.stops.map(s=>`<stop offset="${s.offset}" stop-color="${s.color}"/>`).join('')}</radialGradient>`).join('')}</defs>${shapes.join('')}</svg>`};
}
globalThis.window={devicePixelRatio:1};globalThis.matchMedia=()=>({matches:false});globalThis.ResizeObserver=class{observe(){}};
await mkdir('artifacts',{recursive:true});
const selected=process.argv.slice(2);
for(const [name,year,width,focus,history,movie] of [['beginning',1,1200,false,false],['beach-party',24,1200,'beach',false],['palace',1350,1200,true,false],['final-island',2200,1200,false,true],['mobile-palace',1350,390,true,false],['movie-independent',2240,1200,false,false,'independent'],['movie-miracles',2240,1200,false,false,'miracles'],['movie-fortress',2240,1200,false,false,'fortress'],['movie-last-drop',2240,1200,false,false,'last-drop']]){
 if(selected.length&&!selected.includes(name))continue;
 const sim=new Civilization(31);while(sim.year<year&&!sim.ending)sim.tick();
 if(movie){startCinema(sim,movie);sim.cinematic.elapsed=17;sim.ending=true;}
 if(focus==='beach'){const t=sim.beaches[Math.floor(sim.beaches.length/2)];sim.festival={kind:'duck-race',x:t.x,y:t.y,until:sim.year+20,title:'The Great Duck Regatta',quips:['A duck has been disqualified for being a goose.']};}
 const r=recorder(width,width<500?600:650),renderer=new IslandRenderer(r.canvas,sim);
 renderer.reduced=true;renderer.showHistory=history;
 if(focus)renderer.focusTile(focus==='beach'?sim.beaches[Math.floor(sim.beaches.length/2)]:sim.tile(-1,1),90);
 for(let i=0;i<100;i++)renderer.draw(i*16+100);
 const svg=r.svg().replace(/(fill|stroke|stop-color)="(#[0-9a-fA-F]{6})([0-9a-fA-F]{2})"/g,(_,attr,color,alpha)=>`${attr}="${color}" ${attr==='stop-color'?'stop-opacity':attr+'-opacity'}="${parseInt(alpha,16)/255}"`);
 await writeFile(`artifacts/${name}.svg`,svg);
 console.log(`${name}: year ${sim.year}, ${sim.land.length} tiles, ${Math.round(sim.population)} people`);
}

for(const [name,id,width]of [['finale-fortress','fortress',800],['finale-phoenix','phoenix',800],['finale-independent','independent',800],['finale-mobile','fortress',390]]){
 if(selected.length&&!selected.includes(name))continue;
 const s=new Civilization(31),r=recorder(width,330);drawFinale(r.canvas.getContext('2d'),width,330,s,{id,elapsed:17},false);
 await writeFile(`artifacts/${name}.svg`,r.svg().replace(/(fill|stroke)="(#[0-9a-fA-F]{6})([0-9a-fA-F]{2})"/g,(_,attr,color,alpha)=>`${attr}="${color}" ${attr}-opacity="${parseInt(alpha,16)/255}"`));
 console.log(`${name}: dedicated ending animation`);
}
