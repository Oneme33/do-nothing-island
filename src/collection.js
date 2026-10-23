import {ENDINGS} from './story.js';
import {CHALLENGE_CATALOG} from './challenges.js';
import {nl} from './language.js';
import {TREASURE_CATALOG} from './coast.js';

export const COLLECTION_STORAGE_KEY='do-nothing-island-collection-v1';
const endingHints={artists:'Een eiland vol beroemde makers kiest misschien voor de kunst.',funfair:'Wie houdt van dieren, draaimolens en feest…',seafarers:'Bezoekers, buren en veerboten verbinden een eiland met de wereld.',independent:'Soms is blijven kijken genoeg.',sanctuary:'Misschien hoeft vooruitgang niet alles te vullen.',miracles:'Wat als de hemel deel van de begroting wordt?',fortress:'Een onrustige grond laat sporen in een cultuur.',phoenix:'As kan het begin van iets moois zijn.',retreat:'Een stap terug kan ook een toekomst zijn.','last-drop':'Er bestaat een grens aan winnen van de zee.'};
export const SECRET_CATALOG=[
 {discovery:'old-tree-bloom',title:'Hij wist nog hoe het moest',description:'Na drie gerichte regenbuien bloeit de oude boom. De bloesem blijft als herinnering.',hint:'Misschien herinnert een oude vriend zich de lente nog.'},
 {discovery:'quake-volcano',title:'De slapende berg',description:'Een beving bij de vulkaan veroorzaakte een uitbarsting. As verrijkte de grond.',hint:'Sommige slapende reuzen voelen de grond bewegen.'},
 {discovery:'rain-quake',title:'De grond stroomt',description:'Een beving na regen werd een modderstroom. Een laag vruchtbaar slib bleef achter.',hint:'Wat doet bewegende grond die pas nog doorweekt raakte?'},
 {discovery:'landslide',title:'Wat er onder de berg zit',description:'Een aardverschuiving legde gesteente bloot. De bouwers vonden er een steengroeve.',hint:'Een berg bewaart meer dan alleen een uitzicht.'},
 {discovery:'uplift',title:'Land uit de zee',description:'Een beving tilde de kust op. Er ontstond nieuw land zonder inpoldering.',hint:'De zee hoeft niet altijd te vertrekken door een pomp.'},
 {discovery:'rift',title:'De overkant bleef liggen',description:'Een beving opende een kloof. Een brug kan de twee kanten weer verbinden.',hint:'De grond onthoudt herhaalde onrust.'},
 {discovery:'spring',title:'De verborgen bron',description:'Een beving opende een blijvende zoetwaterbron.',hint:'Soms ligt het antwoord op dorst onder je voeten.'},
 {discovery:'fire-tradition',title:'Een feest dat terugkomt',description:'Een bestaand kampvuur werd een jaarlijkse traditie. Ook vuur tijdens een feest kan zo een lichtfeest worden.',hint:'Een vuurplaats kent misschien een tweede begin. Er mogen hapjes bij.'}
];
export const COLLECTION_CATALOG=[
 ...Object.entries(ENDINGS).map(([id,ending])=>({id:`ending:${id}`,group:'endings',title:nl(ending.title),description:nl(ending.description),hint:endingHints[id]})),
 {id:'moment:manor',group:'moments',title:'De eerste grote voordeur',description:'De eerste hut groeide uit tot een landhuis. De sleutel bleef in de familie.',hint:'Ook een bescheiden voordeur kan ambities krijgen.'},
 {id:'moment:palace',group:'moments',title:'Van hut tot paleis',description:'Op de plek van de eerste hut staat nu een paleis, met tuinen en bijzonder veel gordijnen.',hint:'Sommige uitbouwen lopen een beetje uit de hand.'},
 {id:'moment:generations',group:'moments',title:'Tien keer de sleutel',description:'Tien generaties hebben de sleutel van het eerste huis doorgegeven.',hint:'Niet alles wat groeit, staat op de kaart.'},
 {id:'moment:volcano',group:'moments',title:'De berg heeft een mening',description:'Je zag een vulkaan ontwaken. De bouwers houden de gratis steen.',hint:'Niet iedere berg blijft voor altijd stil.'},
 {id:'moment:rebirth',group:'moments',title:'Sterker uit de as',description:'Een uitgebrand gebouw werd herbouwd in steen. De oude brand bleef in de gevel herdacht.',hint:'Een ruïne hoeft geen eindpunt te zijn.'},
 {id:'moment:waterfront',group:'moments',title:'De wijk komt terug',description:'Een overstroomde wijk heropende met hoogwaterstrepen en sterkere funderingen.',hint:'Zoek een nieuw begin waar het water net vertrokken is.'},
 ...SECRET_CATALOG.map(secret=>({...secret,id:`secret:${secret.discovery}`,group:'secrets'})),
 ...TREASURE_CATALOG.map(t=>({id:`treasure:${t.id}`,group:'treasures',title:t.title,description:t.description,hint:t.hint})),
 ...CHALLENGE_CATALOG.map(goal=>({id:`challenge:${goal.id}`,group:'challenges',title:goal.title,description:goal.description,hint:goal.experiment?'Een ongewoon idee van een eiland wacht op uitvoering.':'Sommige eilanden hebben een klein extra idee. Zoek hun uitdagingen op.'}))
];
export const COLLECTION_GROUPS={endings:'Eindes',moments:'Bijzondere momenten',challenges:'Uitdagingen',secrets:'Geheimen',treasures:'Schatten'};
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
 for(const secret of SECRET_CATALOG){
  if(!s.discoveries?.includes(secret.discovery))continue;
  const field={'old-tree-bloom':'bloomYear','quake-volcano':'volcanicAshYear','rain-quake':'mudflowYear',landslide:'landslideYear',uplift:'upliftedYear',rift:'riftYear',spring:'springYear','fire-tradition':'traditionYear'}[secret.discovery];
  const evidence=s.land.find(t=>Number.isInteger(t[field]));
  remember(`secret:${secret.discovery}`,s.discoveryRecords?.[secret.discovery]?.year||evidence?.[field]);
 }
 for(const t of s.coast?.treasures||[])if(TREASURE_CATALOG.some(c=>c.id===t.id))remember(`treasure:${t.id}`,t.year);
 const home=s.tile(-1,1),building=home?.building==='ruins'?home.rebuildFrom:home?.building;
 if(['manor','palace'].includes(building))remember('moment:manor',s.snapshots.find(p=>p.label==='The first manor')?.year||(building==='manor'?home.builtYear:s.year));
 if(building==='palace'||s.court)remember('moment:palace',s.snapshots.find(p=>p.label==='The palace and its gardens')?.year||home.builtYear);
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
