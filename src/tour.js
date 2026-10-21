import {nl} from './language.js';
import {currentRelative,familyLore} from './family.js';
// The closing tour: up to five big moments spread over the island's history, the first home, then the old tree.
// The family is visited at the first home, so its own entries are not separate stops.
const TOUR_TYPES=new Set(['interference','treasure','lighthouse','discovery','flood','palace','fire','wish']);
export function tourStops(s){
 const placed=s.history.filter(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)&&s.tile(e.x,e.y)?.kind==='land'&&!(e.x===0&&e.y===0)&&TOUR_TYPES.has(e.type)&&(e.type!=='wish'||s.wishes?.history?.some(w=>w.id===e.wishId&&w.status==='helped')));
 const moments=[];
 if(placed.length){
  const wanted=Math.min(5,placed.length);
  for(let i=0;i<wanted;i++){const entry=placed[Math.round(i*(placed.length-1)/Math.max(1,wanted-1))];if(!moments.includes(entry))moments.push(entry);}
 }
 const stops=moments.map(e=>({x:e.x,y:e.y,seconds:4,eyebrow:`JAAR ${e.year}`,text:nl(e.text)}));
 const family=s.family,home=family?.home||{x:-1,y:1};
 if(family){const first=family.generations[0];stops.push({x:home.x,y:home.y,seconds:4,eyebrow:'HET EERSTE HUIS',text:`Hier begon ${first.name} ${family.lastName} met één huisje en een akker. ${family.generations.length} generaties later staat het er nog.`});}
 const last=family?currentRelative(s):null,lore=family?familyLore(family,1):[];
 stops.push({x:0,y:0,seconds:6,zoom:2,eyebrow:'ONDER DE OUDE BOOM',text:last?`${last.name} ${family.lastName}, generatie ${last.generation}, zit onder de oude boom.${lore.length?` Aan tafel gaat het nog altijd over ${lore.map(m=>m.memory).join(' en ')}.`:''} De boom was er als eerste, en is er nog.`:'De oude boom was er als eerste, en is er nog.'});
 return stops;
}
