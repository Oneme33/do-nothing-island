// Famous residents and archaeologists: the island remembers its own people and digs up its own past.
const fameHash=(seed,a,b=0)=>{let x=(seed^Math.imul(a+29,0x2545f491)^Math.imul(b+3,0x9e3779b1))>>>0;x=Math.imul(x^(x>>>15),0x85ebca6b);x^=x>>>13;return(x>>>0)/4294967296;};
const FAME_FIRST=['Hendrika','Govert','Marijke','Teunis','Aaltje','Wubbo','Grietje','Barend','Fenna','Ludo','Sjaan','Kees','Doortje','Bartel','Mien','Okke'];
const FAME_LAST=['Zeewind','Brakwater','Kokkel','Duinhart','Wierook','Strandloper','Mosselman','Kleiweg'];
export const FAMOUS=[
 {id:'chef',since:500,role:'kok',when:s=>s.food>s.population*1.1,deed:'bedenkt de eilandstamppot. Maandag heet voortaan stamppotdag, ook als het dinsdag is.',exhibit:'De pollepel',effect:s=>{s.food+=30;}},
 {id:'painter',since:900,role:'schilder',when:s=>s.prosperity>42,deed:'schildert het eiland zo mooi dat de meeuwen er speciaal voor gaan poseren.',exhibit:'Het eiland bij avond, in olieverf',effect:s=>{s.prosperity=Math.min(94,s.prosperity+3);}},
 {id:'poet',since:1150,role:'dichter',when:()=>true,deed:'schrijft een gedicht van één regel over de zee. Iedereen kent het uit het hoofd; niemand weet wat het betekent.',exhibit:'Het gedicht, op een servetje',effect:s=>{s.unrest=Math.max(0,(s.unrest||0)-5);}},
 {id:'inventor',since:1480,role:'uitvinder',when:s=>s.technology>=1.6,deed:'vindt de zelfrijdende kruiwagen uit. Hij rijdt alleen linksom, maar wel heel overtuigd.',exhibit:'De linksom-kruiwagen',effect:s=>{s.technology+=.5;}},
 {id:'astronomer',since:1650,role:'sterrenkundige',when:s=>s.land.some(t=>t.building==='observatory'),deed:'ontdekt een nieuwe ster en noemt hem naar haar kat. De kat reageert niet.',exhibit:'De telescoop met kattenharen',effect:s=>{s.technology+=.3;}},
 {id:'composer',since:1760,role:'componist',when:()=>true,deed:'schrijft het eilandlied. Er zijn geen woorden, alleen heel veel ‘la’. Het wordt een hit.',exhibit:'Het eilandlied, eerste druk',effect:s=>{s.prosperity=Math.min(94,s.prosperity+2);}},
 {id:'swimmer',since:1935,role:'zwemmer',when:s=>s.land.some(t=>t.building==='pool'),deed:'zwemt rond het hele eiland. Twee keer, want de eerste keer keek niemand.',exhibit:'De badmuts met de deuk',effect:s=>{s.prosperity=Math.min(94,s.prosperity+2);}},
 {id:'astronaut',since:2065,role:'astronaut',when:s=>s.land.some(t=>t.building==='spaceport'),deed:'gaat als eerste eilander naar de ruimte en zwaait vanaf de maan. Het hele eiland zwaait terug, voor de zekerheid.',exhibit:'Een maansteen in een jampot',effect:s=>{s.technology+=.4;}}
];
const fameName=(s,i)=>`${FAME_FIRST[Math.floor(fameHash(s.seed,i,1)*FAME_FIRST.length)]} ${FAME_LAST[Math.floor(fameHash(s.seed,i,2)*FAME_LAST.length)]}`;
const HOMES=new Set(['hut','house','townhouse','tower']);
export function advanceFamous(s){
 s.famous??=[];if(s.ending||s.year%23!==11)return;
 const def=FAMOUS.find(d=>s.year>=d.since&&!s.famous.some(f=>f.id===d.id)&&d.when(s));
 if(!def||fameHash(s.seed,s.year,5)>.45)return;
 const homes=s.houses.filter(t=>HOMES.has(t.building)&&!t.foundingHome&&!t.plaque);if(!homes.length)return;
 const home=homes[Math.floor(fameHash(s.seed,s.year,9)*homes.length)],index=FAMOUS.indexOf(def),name=fameName(s,index);
 home.plaque={id:def.id,name,year:s.year};
 s.famous.push({id:def.id,name,year:s.year,x:home.x,y:home.y});
 def.effect(s);
 s.log(`${name}, ${def.role} van het eiland, ${def.deed} Er komt een blauw bordje op het huis.`,'famous',{x:home.x,y:home.y});
 s.signal('celebrate',home,`${name}, ${def.role}`);
}
// Archaeology: from 1890 careful people with small brushes look for the island's own past.
export const DIG_YEAR=1890;
const FINDS=[
 {id:'hoe',when:s=>!!s.family,title:s=>`De schoffel van ${s.family.generations[0].name}`,text:'Met de initialen erin gekrast. Hij is nog verrassend scherp.'},
 {id:'shard',when:()=>true,title:()=>'Een scherf van de eerste pot',text:'Er staat een vingerafdruk op. Het museum heeft al drie mensen gevraagd of hij van hen is.'},
 {id:'boot',when:()=>true,title:()=>'Eén laars, maat 47',text:'Het zoeken naar de andere laars is nu een officiële feestdag.'},
 {id:'arrow',when:s=>!!s.court,title:()=>'Een pijlpunt van De Burcht',text:'Hij is nooit afgeschoten. Iedereen is daar heel trots op.'},
 {id:'bucket',when:s=>(s.fireCount||0)>0,title:()=>'Een verkoolde emmer',text:'Van de eerste grote brand. Er zit nog een beetje water in, zegt de suppoost.'},
 {id:'keys',when:()=>true,title:()=>'Een bos met zeventien sleutels',text:'Eén past nog op de deur van het eerste huis. De andere zestien op niets.'},
 {id:'whale',when:()=>true,title:()=>'Een steen met een walvis erop',text:'Getekend lang voordat er iemand woonde. Of de walvis tekende hem zelf.'},
 {id:'dice',when:()=>true,title:()=>'Een dobbelsteen met zeven ogen',text:'Dat verklaart een hoop over de oude spelletjesavonden.'}
];
export const findTitle=(s,f)=>{const d=FINDS.find(x=>x.id===f.id);return d?d.title(s):'Een vondst';};
export const findText=f=>FINDS.find(x=>x.id===f.id)?.text||'';
export function advanceDigs(s){
 s.digs??={finds:[],site:null};const d=s.digs;if(s.ending)return;
 if(d.site){
  const t=s.tile(d.site.x,d.site.y);
  if(s.year<d.site.until)return;
  const find=FINDS.find(f=>f.id===d.site.find);
  if(t){if(t.dig?.before&&!t.building)t.building=t.dig.before;t.dig=null;if(t.reservedFor==='dig')t.reservedFor=null;}
  if(find){d.finds.push({id:find.id,year:s.year,x:d.site.x,y:d.site.y});s.log(`De archeologen vinden ${find.title(s).replace(/^(Een|De) /,m=>m.toLowerCase())}. ${find.text}`,'treasure',{x:d.site.x,y:d.site.y});s.signal('celebrate',t||d.site,'Een vondst!');}
  d.site=null;return;
 }
 if(s.year<DIG_YEAR||s.year%37!==19||s.storm)return;
 const find=FINDS.find(f=>!d.finds.some(x=>x.id===f.id)&&f.when(s));if(!find)return;
 // The old heart of the island is the most promising; a park or a lone tree makes way for a while.
 const spots=s.land.filter(t=>(!t.building||['tree','park','garden'].includes(t.building))&&!t.buildSite&&!t.reservedFor&&!t.landform&&!t.road&&!t.river&&!t.foundingHome&&!t.commissioned).sort((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y));
 if(!spots.length)return;
 const spot=spots[Math.floor(fameHash(s.seed,s.year,13)*Math.ceil(spots.length/3))];
 spot.dig={since:s.year,find:find.id,before:spot.building||null};spot.building=null;spot.reservedFor='dig';d.site={x:spot.x,y:spot.y,since:s.year,until:s.year+10,find:find.id};
 s.log('Archeologen zetten een stukje grond af met touwtjes. Ze graven met kwastjes, heel langzaam, en zeggen vaak ‘hmm’.','culture',{x:spot.x,y:spot.y});
}
// Drawing: blue plaques on the homes of famous residents, and a dig with a tent, a grid and a kneeling digger.
export function drawFamous(r){
 const s=r.sim,still=r.reduced,t=still?0:r.activityTime;
 for(const tile of r.visibleTiles||[]){
  if(tile.kind!=='land')continue;
  if(tile.plaque&&HOMES.has(tile.building)){
   const p=r.p(tile.x,tile.y);
   r.enqueueActor(p.y+6,()=>{r.ellipse(p.x+9,p.y-7,2.3,2.3,'#f4f1e8');r.ellipse(p.x+9,p.y-7,1.8,1.8,'#2f5f9a');if(r.zoom>1.4){const b=still?0:Math.sin(t*2+tile.x)*1;r.poly([[p.x,p.y-46+b],[p.x+1.2,p.y-43.4+b],[p.x+3.8,p.y-43.2+b],[p.x+1.8,p.y-41.6+b],[p.x+2.4,p.y-39+b],[p.x,p.y-40.4+b],[p.x-2.4,p.y-39+b],[p.x-1.8,p.y-41.6+b],[p.x-3.8,p.y-43.2+b],[p.x-1.2,p.y-43.4+b]],'#f2c94c');}});
  }
  if(tile.dig){
   const p=r.p(tile.x,tile.y),brush=still?0:Math.sin(t*5)*1.5;
   r.enqueueActor(p.y+1,()=>{
    r.diamond(p.x,p.y+1,15,7.5,'#a98a62');r.diamond(p.x,p.y+2,12,6,'#8d6f4d');
    r.line([[p.x-6,p.y-1],[p.x+6,p.y+5]],'#f2ead6',.4);r.line([[p.x-6,p.y+5],[p.x+6,p.y-1]],'#f2ead6',.4);
    for(const [x,y] of [[-15,1],[0,-6.5],[15,1],[0,8.5]])r.line([[p.x+x,p.y+y],[p.x+x,p.y+y-4]],'#7a5c42',.8);
    r.poly([[p.x-20,p.y-6],[p.x-13,p.y-15],[p.x-6,p.y-6]],'#f2ede0');r.poly([[p.x-13,p.y-15],[p.x-6,p.y-6],[p.x-9,p.y-5]],'#d8d0bd');
    r.ellipse(p.x+4,p.y+1,1.8,1.4,'#e9e1cf');r.ellipse(p.x+4.4,p.y-3,1.6,1.6,'#e5b98f');r.ellipse(p.x+4.4,p.y-4.3,2.2,.8,'#d8c06a');
    r.line([[p.x+3,p.y-.5],[p.x+brush,p.y+2.5]],'#8a6a4c',.7);
   });
  }
 }
}
