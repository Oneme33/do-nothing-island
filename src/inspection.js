export const PLACE_NAMES={hut:'Huisje',house:'Woonhuis',townhouse:'Herenhuis',tower:'Appartementen',manor:'Landhuis',palace:'Paleis',farm:'Akker',forest:'Bos',beach:'Strand',park:'Park',garden:'Tuin',tree:'Boom','original-tree':'De oorspronkelijke boom',well:'Waterput',market:'Markt',library:'Bibliotheek',school:'School','science-center':'Wetenschapscentrum',factory:'Fabriek',workshop:'Werkplaats',powerplant:'Elektriciteitscentrale',solar:'Zonnepanelen',turbine:'Windturbine',windmill:'Molen',statue:'Standbeeld',theater:'Theater',shrine:'Heiligdom',church:'Kerk',dock:'Aanlegsteiger',harbor:'Haven',bridge:'Brug',pump:'Gemaal',shop:'Winkel',bakery:'Bakkerij',cafe:'Café',playground:'Speeltuin',fairground:'Kermis',campfire:'Kampvuur',bonfire:'Vuurplaats','festival-ground':'Feestterrein','palace-wing':'Paleisvleugel','royal-garden':'Paleistuin','palace-square':'Paleisplein','campus-square':'Kennisplein','fire-station':'Brandweerkazerne',quarry:'Steengroeve',lighthouse:'Vuurtoren',ruins:'Ruïne'};
import {currentRelative,familyStory} from './family.js';
import {TREASURE_CATALOG} from './coast.js';
const names=['Noor','Sam','Bo','Mila','Daan','Lou','Iris','Mo','Tess','Finn','Ada','Jip'];
const surnames=['de Vries','van de Kust','Bos','van Dijk','de Boer','Steen','van de Berg','Visser'];
export function describePlot(s,t){
 if(!t)return 'Open zee. De vissen hebben geen bouwplannen.';
 const hash=Math.abs((s.seed+t.x*31+t.y*127)|0),lines=[];
 const heading=t.buildSite?`Bouwplaats · ${PLACE_NAMES[t.buildSite.type]||'nieuw gebouw'} · ${Math.round(t.buildSite.progress/t.buildSite.duration*100)}%`:t.landform?({mountain:'Berg',hill:'Heuvel',volcano:'Vulkaan'}[t.landform]):PLACE_NAMES[t.building]||(t.rift?'Kloof':t.spring?'Zoetwaterbron':t.burntForest?'Open plek na de bosbrand':t.kind==='water'?'Zee':'Onbebouwde grond');
 lines.push(t.foundingHome?`${heading} · het allereerste huis`:heading);
 if(t.building){lines.push(t.builtYear?`Gebouwd in jaar ${t.builtYear}${t.rebuiltYear?`; herbouwd in ${t.rebuiltYear}`:''}.`:'Dit gebouw staat hier al sinds de oude eilandgeschiedenis.');}
 const index=s.houses.findIndex(home=>home.x===t.x&&home.y===t.y);
 const treasure=t.treasure&&TREASURE_CATALOG.find(c=>c.id===t.treasure.id);
 if(treasure)lines.push(`Hier werd in jaar ${t.treasure.year} ${treasure.short} gevonden.`);
 if(t.foundingHome){
  const person=currentRelative(s);lines.push(`Hier hoort familie ${person.lastName} thuis. ${person.name} bewaart nu de sleutel (generatie ${person.generation}).`);
  lines.push(`Beroep: ${person.occupation}. ${person.name} ${person.quirk}.`);
  const parent=s.family.generations.find(p=>p.id===person.parentId),story=familyStory(s.family,person)||(parent&&familyStory(s.family,parent));
  if(story)lines.push(`Aan tafel gaat het nog vaak over ${story}.`);
  if(t.building==='ruins')lines.push('De familie woont tijdelijk elders tot het eerste huis is herbouwd.');
 }
 if(index>=0){
  const population=Math.floor(s.population),count=Math.floor(population/s.houses.length)+(index<population%s.houses.length?1:0);
  if(!t.foundingHome)lines.push(`Hier woont familie ${surnames[hash%surnames.length]}: ${names[hash%names.length]} en ${names[(hash+5)%names.length]}${count>2?` en ${count-2} huisgenoten`:''}. ${count} bewoners.`);
  lines.push(`Bouwmateriaal: ${t.material==='stone'?'steen':t.material==='brick'?'baksteen':s.era>=2?'baksteen en steen':'hout en leem'}.`);
 }
 if(t.fire)lines.push('Brandt nu. De bewoners brengen emmers; elke seconde telt.');
 if(t.fireHistory)lines.push(`${t.fireHistory} brand${t.fireHistory===1?'':'en'} meegemaakt; de laatste in jaar ${t.lastFireYear}.`);
 if(t.quakeHistory)lines.push(`${t.quakeHistory} beving${t.quakeHistory===1?'':'en'} doorstaan; de laatste in jaar ${t.lastQuakeYear}.`);
 if(t.quakeDamage)lines.push(`Schade: ${Math.round(t.quakeDamage*100)}%. Herstel is bezig.`);
 if(t.rebuildFrom)lines.push(`Wederopbouw vanaf jaar ${t.rebuildAt}. De oude functie keert terug in steen.`);
 const verbs={nudge:'Bouwers geholpen',rain:'Regen gekregen',rumble:'Beving gevoeld',fire:'Vuur aangestoken',repair:'Noodhulp ontvangen'};
 for(const e of (t.lifeEvents||[]).slice(-3))lines.push(`Jaar ${e.year}: ${verbs[e.type]||'Een bezoek van buitenaf'}.`);
 if(t.irrigated)lines.push('Blijvende irrigatie. De boeren hoeven minder vaak naar de lucht te kijken.');
 if(t.ashFertility)lines.push(`Vruchtbare as: +${Math.round(t.ashFertility*100)}% opbrengst voor een akker op deze grond.`);
 if(t.retrofitted)lines.push('De fundering is versterkt na eerdere schade.');
 if(t.floodHistory)lines.push(`${t.floodHistory} overstromingen overleefd. Hoogwaterstrepen blijven zichtbaar.`);
 if(t.bloomYear)lines.push(`Na drie gerichte regenbuien bloeit deze boom sinds jaar ${t.bloomYear}. De familie noemt het zijn tweede lente.`);
 if(t.festivalTraditionYear)lines.push(`In jaar ${t.festivalTraditionYear} werd vuur tijdens het feest een jaarlijkse traditie.`);
 if(t.traditionCount)lines.push(`Sinds jaar ${t.traditionYear}: een terugkerend lichtfeest.`);
 if(t.spring)lines.push(`Sinds jaar ${t.springYear} stroomt hier vers water. De bron ondersteunt de watervoorraad.`);
 if(t.upliftedYear)lines.push(`In jaar ${t.upliftedYear} door een beving uit zee omhooggekomen.`);
 if(t.riftYear)lines.push(`De kloof ontstond in jaar ${t.riftYear}. ${t.building==='bridge'?'Een brug verbindt de overkant.':'Een brug kan de route herstellen.'}`);
 if(t.landslideYear)lines.push(`Een aardverschuiving in jaar ${t.landslideYear} veranderde de bergflank.`);
 if(t.mudflowYear)lines.push(`Een modderstroom in jaar ${t.mudflowYear} liet een laag slib achter.`);
 if(t.quarryYear)lines.push('Levert ieder jaar extra steen voor de bouwers.');
 if(t.civicLegacy)lines.push(`Een blijvende herinnering aan het werk van de raad.`);
 const jokes=t.building==='farm'?['De wortels nemen alle lof in ontvangst.','De vogelverschrikker heeft nog nooit vakantie gehad.']:t.fireHistory?['De verzekering vraagt voortaan eerst naar het weer.','De rookmelder is inmiddels familie.']:index>=0?['Er wordt al drie generaties over de heg gediscussieerd.','De voordeur klemt. Dat noemen ze karakter.','De buren lenen de ladder voor onbepaalde tijd.']:['Uitstekende plek om even niets te doen.','Volgens de raad heeft dit een visie nodig.'];
 lines.push(jokes[hash%jokes.length]);return lines.join('\n');
}
