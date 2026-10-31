import {nl} from './language.js';
import {currentRelative,familyLore} from './family.js';
import {islandScores,ISLAND_CHECKLIST} from './finale.js';
// The closing tour: up to five big moments spread over the island's history, the first home, then the old tree.
// The family is visited at the first home, so its own entries are not separate stops.
const TOUR_TYPES=new Set(['interference','treasure','lighthouse','discovery','flood','palace','fire','wish','delight']);
export function tourStops(s){
 const placed=s.history.filter(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)&&s.tile(e.x,e.y)?.kind==='land'&&!(e.x===0&&e.y===0)&&TOUR_TYPES.has(e.type)&&(e.type!=='wish'||s.wishes?.history?.some(w=>w.id===e.wishId&&w.status==='helped')));
 const moments=[];
 if(placed.length){
  const wanted=Math.min(3,placed.length);
  for(let i=0;i<wanted;i++){const entry=placed[Math.round(i*(placed.length-1)/Math.max(1,wanted-1))];if(!moments.includes(entry))moments.push(entry);}
 }
 const stops=moments.map(e=>({x:e.x,y:e.y,seconds:4,eyebrow:`JAAR ${e.year}`,text:nl(e.text)}));
 // The inspector's round: a few of the proudest things on the island, then the verdict over the whole island.
 const keur=s.outcome?.scores?.checklist?s.outcome.scores:islandScores(s);
 const showcase=['castle','theme-park','zoo','spaceport','lighthouse','observatory','circus'].map(id=>{
  const item=ISLAND_CHECKLIST.find(i=>i.id===id),tile=id==='castle'?(s.court&&s.tile(s.court.x,s.court.y)):s.land.find(t=>t.building===item?.at);
  return tile&&item?{x:tile.x,y:tile.y,seconds:3,zoom:2.1,eyebrow:'DE EILANDKEUR',text:`✓ ${item.label}${tile.builtYear?`, sinds jaar ${tile.builtYear}`:''}.`}:null;}).filter(Boolean).slice(0,4);
 stops.push(...showcase);
 stops.push({x:0,y:0,seconds:5,zoom:.85,eyebrow:`DE EILANDKEUR · ${keur.total} VAN 100`,text:`${keur.level.title}. ${keur.done} van de ${keur.items} dingen die een eiland compleet maken staan er. ${keur.level.line}`});
 // The oldest place and the visitor's own most-used gesture get their own moment in the closing tour.
 if(s.origin&&s.tile(s.origin.x,s.origin.y)?.kind==='land')stops.push({x:s.origin.x,y:s.origin.y,seconds:4,zoom:2.2,eyebrow:'HET OUDSTE SPOOR',text:`${s.origin.name}. ${s.origin.description}`});
 const influence=s.influence||{},labels={fire:'vuur',rain:'regen',nudge:'een duwtje',rumble:'bevingen',rescues:'reddingen'};
 const dominant=Object.keys(labels).filter(kind=>(influence[kind]||0)>0).sort((a,b)=>(influence[b]||0)-(influence[a]||0))[0];
 const touch=s.interventionLedger?.at(-1);
 if(dominant&&touch&&Number.isFinite(touch.x)&&Number.isFinite(touch.y))stops.push({x:touch.x,y:touch.y,seconds:4,zoom:2.1,eyebrow:`JOUW SPOOR · ${influence[dominant]}× ${labels[dominant].toUpperCase()}`,text:`Hier bleef je laatste ingreep hangen. ${nl(touch.consequence)}. Het eiland heeft er inmiddels een gewoonte van gemaakt.`});
 const family=s.family,home=family?.home||{x:-1,y:1};
 if(family){const first=family.generations[0];stops.push({x:home.x,y:home.y,seconds:4,eyebrow:'HET EERSTE HUIS',text:`Hier begon ${first.name} ${family.lastName} met één huisje en een akker. ${family.generations.length} generaties later staat het er nog.`});}
 const last=family?currentRelative(s):null,lore=family?familyLore(family,1):[];
 stops.push({x:0,y:0,seconds:6,zoom:2,eyebrow:'ONDER DE OUDE BOOM',text:last?`${last.name} ${family.lastName}, generatie ${last.generation}, zit onder de oude boom.${lore.length?` Aan tafel gaat het nog altijd over ${lore.map(m=>m.memory).join(' en ')}.`:''} De boom was er als eerste, en is er nog.`:'De oude boom was er als eerste, en is er nog.'});
 return stops;
}
