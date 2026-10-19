import {ENDINGS} from './story.js';
import {CHALLENGE_CATALOG} from './challenges.js';
import {nl} from './language.js';

export const COLLECTION_STORAGE_KEY='do-nothing-island-collection-v1';
const endingHints={independent:'Soms is blijven kijken genoeg.',sanctuary:'Misschien hoeft vooruitgang niet alles te vullen.',miracles:'Wat als de hemel deel van de begroting wordt?',fortress:'Een onrustige grond laat sporen in een cultuur.',phoenix:'As kan het begin van iets moois zijn.',retreat:'Een stap terug kan ook een toekomst zijn.','last-drop':'Er bestaat een grens aan winnen van de zee.'};
export const COLLECTION_CATALOG=[
 ...Object.entries(ENDINGS).map(([id,ending])=>({id:`ending:${id}`,group:'endings',title:nl(ending.title),description:nl(ending.description),hint:endingHints[id]})),
 {id:'moment:manor',group:'moments',title:'De eerste grote voordeur',description:'De eerste hut groeide uit tot een landhuis. De sleutel bleef in de familie.',hint:'Ook een bescheiden voordeur kan ambities krijgen.'},
 {id:'moment:palace',group:'moments',title:'Van hut tot paleis',description:'Op de plek van de eerste hut staat nu een paleis, met tuinen en bijzonder veel gordijnen.',hint:'Sommige uitbouwen lopen een beetje uit de hand.'},
 {id:'moment:generations',group:'moments',title:'Tien keer de sleutel',description:'Tien generaties hebben de sleutel van het eerste huis doorgegeven.',hint:'Niet alles wat groeit, staat op de kaart.'},
 {id:'moment:volcano',group:'moments',title:'De berg heeft een mening',description:'Je zag een vulkaan ontwaken. De bouwers houden de gratis steen.',hint:'Niet iedere berg blijft voor altijd stil.'},
 {id:'moment:rebirth',group:'moments',title:'Sterker uit de as',description:'Een uitgebrand gebouw werd herbouwd in steen. De oude brand bleef in de gevel herdacht.',hint:'Een ruïne hoeft geen eindpunt te zijn.'},
 {id:'moment:waterfront',group:'moments',title:'De wijk komt terug',description:'Een overstroomde wijk heropende met hoogwaterstrepen en sterkere funderingen.',hint:'Zoek een nieuw begin waar het water net vertrokken is.'},
 ...CHALLENGE_CATALOG.map(goal=>({id:`challenge:${goal.id}`,group:'challenges',title:goal.title,description:goal.description,hint:goal.experiment?'Een ongewoon idee van een eiland wacht op uitvoering.':'Sommige eilanden hebben een klein extra idee. Zoek hun uitdagingen op.'}))
];
export const COLLECTION_GROUPS={endings:'Eindes',moments:'Bijzondere momenten',challenges:'Uitdagingen'};
const validCollectionRecord=r=>r&&Number.isInteger(r.seed)&&r.seed>=0&&r.seed<=0xffffffff&&Number.isInteger(r.year)&&r.year>=1;
export function readCollection(raw){
 const result={version:1,entries:{}};let parsed;
 try{parsed=typeof raw==='string'?JSON.parse(raw):raw;}catch{return result;}
 if(parsed?.version!==1||!parsed.entries||typeof parsed.entries!=='object')return result;
 for(const {id} of COLLECTION_CATALOG){const record=parsed.entries[id];if(validCollectionRecord(record))result.entries[id]={seed:record.seed,year:record.year};}
 return result;
}
export function mergeCollections(target,source){
 let changed=false;
 for(const {id} of COLLECTION_CATALOG){const record=source.entries?.[id];if(!target.entries[id]&&validCollectionRecord(record)){target.entries[id]={seed:record.seed,year:record.year};changed=true;}}
 return changed;
}
export function advanceCollection(s){
 s.collectionRecords ||= {};
 const remember=(id,year=s.year)=>{if(!Number.isInteger(s.collectionRecords[id]))s.collectionRecords[id]=Number.isInteger(year)&&year>0?year:s.year;};
 if(s.outcome&&ENDINGS[s.outcome.id])remember(`ending:${s.outcome.id}`,s.outcome.year);
 for(const goal of s.challenges?.goals||[])if(goal.status==='completed'&&CHALLENGE_CATALOG.some(g=>g.id===goal.id))remember(`challenge:${goal.id}`,goal.completedAt);
 const home=s.tile(-1,1),building=home?.building==='ruins'?home.rebuildFrom:home?.building;
 if(['manor','palace'].includes(building))remember('moment:manor',s.snapshots.find(p=>p.label==='The first manor')?.year||(building==='manor'?home.builtYear:s.year));
 if(building==='palace')remember('moment:palace',s.snapshots.find(p=>p.label==='The palace and its gardens')?.year||home.builtYear);
 const tenth=s.family?.generations.find(p=>p.generation>=10&&!p.reconstructed);if(tenth)remember('moment:generations',tenth.since);
 if(s.volcanoActiveUntil>0)remember('moment:volcano');
 if(s.rebuiltFires>0)remember('moment:rebirth',s.land.find(t=>t.rebuiltYear&&t.material==='stone')?.rebuiltYear);
 const repaired=s.land.find(t=>t.floodMemorial);if(repaired)remember('moment:waterfront',repaired.rebuiltYear);
 return s.collectionRecords;
}
export function collectIsland(collection,s){
 const facts=advanceCollection(s);let changed=false;
 for(const {id} of COLLECTION_CATALOG){const year=facts[id];if(!collection.entries[id]&&Number.isInteger(year)&&year>=1){collection.entries[id]={seed:s.seed,year};changed=true;}}
 return changed;
}
