import {nl} from './language.js';
import {TREASURE_CATALOG} from './coast.js';
import {SECRET_CATALOG} from './collection.js';
import {FAMOUS,findTitle,findText} from './famous.js';
import {VISITORS} from './visitors.js';
// The island museum grows by itself: every find, every visit of yours and every old map becomes an exhibit.
const EXHIBIT_NAMES={fire:'De Grote Brand',rumble:'De Beving',rain:'De Wonderbui',nudge:'De Vreemde Bouwhaast',repair:'De Redding'};
export function museumExhibits(s){
 const items=[];
 for(const t of s.coast?.treasures||[]){const c=TREASURE_CATALOG.find(x=>x.id===t.id);if(c)items.push({year:t.year,kind:'Vondst',title:c.title,text:c.description});}
 for(const e of s.interventionLedger||[])if(EXHIBIT_NAMES[e.type])items.push({year:e.year,kind:'Jouw ingreep',title:`${EXHIBIT_NAMES[e.type]} van ${e.year}`,text:`Wat bleef: ${nl(e.consequence).toLowerCase()}.`});
 for(const id of s.discoveries||[]){const c=SECRET_CATALOG.find(x=>x.discovery===id);if(c)items.push({year:s.discoveryRecords?.[id]?.year||0,kind:'Geheim',title:c.title,text:c.description});}
 for(const p of s.snapshots||[])items.push({year:p.year,kind:'Oude kaart',title:`Kaart: ${nl(p.label)}`,text:`${p.land?.length||0} tegels land, ${Math.round(p.population||0)} inwoners.`});
 for(const f of s.famous||[]){const d=FAMOUS.find(x=>x.id===f.id);if(d)items.push({year:f.year,kind:'Beroemde eilander',title:`${d.exhibit} van ${f.name}`,text:`${f.name}, ${d.role}, ${d.deed}`});}
 for(const f of s.digs?.finds||[])items.push({year:f.year,kind:'Opgraving',title:findTitle(s,f),text:findText(f)});
 for(const v of s.visitors?.history||[]){const d=VISITORS.find(x=>x.kind===v.kind);if(d)items.push({year:v.year,kind:'Bezoek',title:`Een souvenir: ${d.label.replace('!','').toLowerCase()}`,text:d.leave});}
 if(s.coast?.lighthouse?.year)items.push({year:s.coast.lighthouse.since||s.coast.lighthouse.year,kind:'Gebouw',title:'De eerste vuurtoren',text:'Een maquette met een heel klein katje op de trap.'});
 if(s.square?.builtYear)items.push({year:s.square.builtYear,kind:'Gebouw',title:'Het dorpsplein',text:'Een foto van de eerste bank. Er zit al iemand op.'});
 return items.sort((a,b)=>a.year-b.year);
}
