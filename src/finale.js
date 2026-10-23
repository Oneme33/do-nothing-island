import {wishTally} from './wishes.js';
const score100=n=>Math.round(Math.max(0,Math.min(100,n)));
const scoreCap=v=>Math.min(1,Math.max(0,v));
// The island inspection ('de eilandkeur'): five parts of twenty points. Watching alone gives a fine island;
// listening to the residents, helping when they ask and keeping disasters small makes it a perfect one.
export const SCORE_RECIPE='Zo haal je 100: help (bijna) elke wens met een vraagteken en grijp verder niet in, laat ze alles bouwen wat bij een compleet eiland hoort (ook een opdracht van jou), houd het groen en schoon, en blus branden op hun verzoek zodat er weinig verloren gaat.';
const has=(s,type)=>s.land.some(t=>t.building===type);
export const ISLAND_CHECKLIST=[
 {id:'square',label:'Een dorpsplein',done:s=>!!s.square?.builtYear,at:'town-square'},
 {id:'harbor',label:'Een haven',done:s=>[...s.tiles.values()].some(t=>t.building==='harbor'||t.building==='dock')},
 {id:'lighthouse',label:'Een vuurtoren',done:s=>has(s,'lighthouse'),at:'lighthouse'},
 {id:'castle',label:'Een kasteel met slotgracht',done:s=>!!s.court,at:'palace'},
 {id:'watermill',label:'Een watermolen',done:s=>has(s,'watermill'),at:'watermill'},
 {id:'petting-farm',label:'Een kinderboerderij',done:s=>has(s,'petting-farm'),at:'petting-farm'},
 {id:'museum',label:'Een museum',done:s=>has(s,'museum'),at:'museum'},
 {id:'observatory',label:'Een sterrenwacht',done:s=>has(s,'observatory'),at:'observatory'},
 {id:'circus',label:'Een circus',done:s=>has(s,'circus'),at:'circus'},
 {id:'zoo',label:'Een dierentuin',done:s=>has(s,'zoo'),at:'zoo'},
 {id:'ice-cream',label:'Een ijssalon',done:s=>has(s,'ice-cream'),at:'ice-cream'},
 {id:'greenhouse',label:'Een kas',done:s=>has(s,'greenhouse'),at:'greenhouse'},
 {id:'station',label:'Een treinstation',done:s=>has(s,'station'),at:'station'},
 {id:'pool',label:'Een zwembad',done:s=>has(s,'pool'),at:'pool'},
 {id:'theme-park',label:'Een pretpark',done:s=>has(s,'theme-park'),at:'theme-park'},
 {id:'spaceport',label:'Een ruimtehaven',done:s=>has(s,'spaceport'),at:'spaceport'},
 {id:'beaches',label:'Drie stranden',done:s=>(s.coast?.beaches?.length||0)>=3},
 {id:'statues',label:'Drie standbeelden',done:s=>(s.monuments?.length||0)>=3},
 {id:'famous',label:'Vijf beroemde eilanders',done:s=>(s.famous?.length||0)>=5},
 {id:'islets',label:'Bewoonde buureilandjes',done:s=>!!s.islets?.list?.length&&s.islets.list.every(i=>i.houses>=i.cap)},
 {id:'finds',label:'Vier opgravingen',done:s=>(s.digs?.finds?.length||0)>=4},
 {id:'treasure',label:'Een gevonden schat',done:s=>(s.coast?.treasures?.length||0)>=1},
 {id:'green',label:'Een groene gordel',done:s=>greenShare(s)>=.1},
 {id:'commission',label:'Een cadeau voor jou',done:s=>(s.commissions?.built?.length||0)>=1}
];
const GREEN=new Set(['park','forest','tree','original-tree','garden','castle-garden','royal-garden','rose-garden']);
export function greenShare(s){return s.land.length?s.land.filter(t=>GREEN.has(t.building)).length/s.land.length:0;}
export function scoreInputs(s){
 const helped=wishTally(s,'helped');
 return{helped,missed:wishTally(s,'expired'),unrequested:Math.max(0,(s.interferences||0)-helped),ownDependence:Math.max(0,(s.influence?.dependence||0)-helped*1.5),
  lost:s.lostBuildings||0,rescued:s.rescuedFires||0,rebuilt:s.rebuiltFires||0,abandoned:s.storyStats?.abandoned||0,ruins:s.land.filter(t=>t.building==='ruins').length,green:greenShare(s)};
}
export const SCORE_LEVELS=[
 {min:100,id:'perfect',title:'Het Perfecte Eiland',line:'Alles erop en eraan, en iedereen tevreden. Dit eiland wordt in verre landen op ansichtkaarten gezet.',color:'#c98fb0'},
 {min:85,id:'gold',title:'Een geweldig eiland',line:'Bijna alles wat een eiland kan hebben, en een gelukkig volk.',color:'#e2b84a'},
 {min:70,id:'silver',title:'Een prachtig eiland',line:'Veel om trots op te zijn, met hier en daar een gemiste kans.',color:'#b9c2c4'},
 {min:50,id:'bronze',title:'Een fijn eiland',line:'Een goed leven, al vroegen ze vaker om hulp dan ze kregen.',color:'#c58b5c'},
 {min:0,id:'plain',title:'Een eiland',line:'Het staat er nog, en dat is ook wat.',color:'#9aa88f'}
];
export const scoreLevel=total=>SCORE_LEVELS.find(l=>total>=l.min);
export function islandScores(s){
 const k=scoreInputs(s),checklist=ISLAND_CHECKLIST.map(item=>({id:item.id,label:item.label,done:!!item.done(s)}));
 const done=checklist.filter(i=>i.done).length;
 const complete=20*done/checklist.length;
 const wellbeing=8*scoreCap(s.prosperity/65)+6*scoreCap(s.freshwater/75)+6*scoreCap(1-(s.unrest||0)/50);
 const nature=10*scoreCap(s.environment/90)+5*scoreCap((100-s.pollution)/75)+5*scoreCap(k.green/.1);
 // Disasters happen anyway; what counts is how much was lost for good, and whether they helped each other back up.
 const resilience=Math.max(0,20-Math.max(0,k.lost-k.rebuilt*.75-4)*.45-Math.min(6,k.abandoned*.25)-(k.ruins?3:0));
 // Being a good neighbour: help when asked, and keep your hands to yourself otherwise.
 const asked=k.helped+k.missed,neighbour=Math.max(0,14*scoreCap(asked?k.helped/asked/.85:0)+6-Math.min(6,k.unrequested*.75));
 const values={compleet:Math.round(complete),welzijn:Math.round(wellbeing),natuur:Math.round(nature),veerkracht:Math.round(resilience),'goede buur':Math.round(neighbour)};
 const total=score100(complete+wellbeing+nature+resilience+neighbour);
 const level=scoreLevel(total);
 return {values,max:20,total,level:{id:level.id,title:level.title,line:level.line,color:level.color},checklist,done,items:checklist.length};
}
// What each part means, in plain words, with a short verdict for the value out of twenty.
const SCORE_MEANING={
 compleet:['Alles erop en eraan: speciale gebouwen, vondsten, beroemdheden en meer',['Er ontbrak nog veel.','Het meeste staat er.','Werkelijk alles erop en eraan.']],
 welzijn:['Welvaart, schoon water en rust onder de bewoners',['Het was vaak krap of onrustig.','De meeste mensen kwamen goed rond.','Iedereen had het goed.']],
 natuur:['Schone lucht, een levend landschap en genoeg groen tussen de huizen',['Er bleef weinig natuur over.','Een redelijk groen eiland.','Een levend, schoon en groen eiland.']],
 veerkracht:['Hoeveel er blijvend verloren ging bij branden, bevingen en hoog water',['Rampen lieten diepe sporen na.','Ze herstelden op eigen tempo.','Na elke ramp stonden ze sterker op.']],
 'goede buur':['Wensen waar je bij hielp, en ingrepen waar niemand om vroeg',['Ze vroegen vaak om hulp en kregen die zelden.','Je hielp soms een handje.','Je was er precies wanneer ze je nodig hadden.']]
};
export function explainScore(name,value,max=20){const [what,verdicts]=SCORE_MEANING[name]||['',['','','']];const share=value/max;return{what,verdict:verdicts[share>=.75?2:share>=.45?1:0]};}
// Old saves stored five scores of 0–100; recompute those so every ending shows the inspection.
export const currentScores=(s,stored)=>stored?.checklist?stored:islandScores(s);
export function drawFinale(c,w,h,s,m,reduced=false){
 if(!m)return;const t=reduced?Math.floor(m.elapsed/6)*6:m.elapsed,id=m.id;
 c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);c.fillStyle='#dfebe0';c.fillRect(0,0,w,h);
 const scale=Math.min(w/600,h/320);c.save();c.translate(w/2,h*.62);c.scale(scale,scale);
 const ellipse=(x,y,a,b,color)=>{c.beginPath();c.ellipse(x,y,a,b,0,0,Math.PI*2);c.fillStyle=color;c.fill();};
 const line=(x,y,a,b,color,width=2)=>{c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
 const rect=(x,y,a,b,color)=>{c.fillStyle=color;c.fillRect(x,y,a,b);};
 const poly=(points,color)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();};
 const house=(x,y,i)=>{rect(x-17,y-25,34,28,'#e8ddbd');poly([[x-22,y-24],[x,y-45],[x+22,y-24]],i%2?'#ae785d':'#98a183');rect(x-4,y-11,8,14,'#8d9b81');rect(x+7,y-19,5,6,'#a2c7bd');};
 const person=(x,y,i)=>{const bounce=Math.sin(t*3+i)*2;ellipse(x,y,7,2,'#70876d33');line(x-2,y,x-3,y-7+bounce,'#817c5b');line(x+2,y,x+4,y-7+bounce,'#817c5b');rect(x-4,y-16+bounce,8,10,['#be8f69','#8da98b','#c4ad70'][i%3]);ellipse(x,y-20+bounce,4,4,'#dfbd8d');};
 const lift=id==='independent'?Math.max(0,t-9)*3:0;
 ellipse(0,42,210,31,'#9db7a04d');c.save();c.translate(0,-lift);
 poly([[-220,9],[0,76],[220,9],[0,-64]],'#92aa77');poly([[-220,9],[0,76],[0,94],[-220,28]],'#b6a47a');poly([[0,76],[220,9],[220,28],[0,94]],'#9d9976');
 const progress=Math.min(1,t/10);
 for(let i=0;i<5;i++){const x=(i-2)*66,y=Math.abs(i-2)*-10;if(id==='phoenix'){c.save();c.translate(x,y+30*(1-progress));c.scale(1,progress||.01);house(0,0,i);c.restore();}else house(x,y,i);}
 if(id==='sanctuary')for(let i=0;i<7;i++){const x=(i-3)*49,y=-45-(i%2)*24;rect(x-3,y-30,6,35,'#9e8862');ellipse(x,y-41,17,21,'#7f9f70');ellipse(x-10,y-33,14,15,'#96ae7a');}
 if(id==='independent')for(let i=0;i<4;i++){const x=(i-1.5)*100,y=-100-Math.sin(t+i)*5;line(x,y+20,x*.8,20,'#a48c64');ellipse(x,y,24,32,['#c58b70','#d4b966','#8da99b','#c3bd83'][i]);}
 if(id==='fortress'){for(let i=0;i<5;i++){const x=(i-2)*66;rect(x-20,3,40,5,'#a7a48c');}line(-170,-78,170,-78,'#a08d66',1);for(let i=0;i<11;i++){const x=-165+i*32;poly([[x,-78],[x+17,-78],[x+8,-64]],i%2?'#b78d64':'#d1b66b');}}
 if(id==='miracles'){rect(-12,-122,24,62,'#c5a461');ellipse(0,-132,22,22,'#ddc583');for(let i=0;i<8;i++){const a=t*.2+i*Math.PI/4;line(Math.cos(a)*32,-132+Math.sin(a)*32,Math.cos(a)*42,-132+Math.sin(a)*42,'#c8ab64',3);}}
 for(let i=0;i<9;i++)person((i-4)*23,39+Math.sin(i)*6,i);
 if(id==='last-drop'){line(170,-112,170,-49,'#a1a68d',14);line(170,-112,218,-112,'#a1a68d',14);line(218,-112,218,-88,'#a1a68d',14);ellipse(218,-24,18,5,'#bcb18f');if(t<18)ellipse(218,-78+((t*.6)%1)*48,3,5,'#82b6af');else{line(204,-61,231,-49,'#aa775b',2);line(231,-61,204,-49,'#aa775b',2);}}
 c.restore();
 if(id==='retreat')for(let i=0;i<3;i++){const x=-200+((t*13+i*135)%450),y=91+i*14;poly([[x-19,y],[x+19,y],[x+10,y+10],[x-10,y+10]],'#ac9770');person(x,y-1,i);line(x,y,x,y-34,'#9f926b',1);poly([[x+1,y-32],[x+1,y-5],[x+19,y-8]],'#f1e4ba');}
 if(t>11&&id!=='last-drop')for(let i=0;i<22;i++){const x=((i*83+t*13)%500)-250,y=((i*49+t*23)%190)-180;rect(x,y,3,5,['#c89c64','#9aaf82','#ca9276'][i%3]);}
 c.restore();
}
