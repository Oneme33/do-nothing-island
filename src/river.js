// A river runs from the high ground to the sea. Its tiles stay free of buildings; roads cross it on little bridges.
const riverAround=t=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:t.x+dx,y:t.y+dy}));
// Finds a meandering course from a peak to a far coast over the tiles that ok() allows; extra() adds cost per tile.
function findCourse(s,ok,extra=()=>0){
 const high=s.land.filter(t=>t.landform).sort((a,b)=>(b.relief||0)-(a.relief||0));
 for(const peak of high){
  const start=riverAround(peak).map(p=>s.tile(p.x,p.y)).find(ok);if(!start)continue;
  // Search the island with uneven costs, so the river meanders instead of running in straight lines like a canal.
  const cost=t=>1+((Math.sin(t.x*12.9898+t.y*78.233+(s.seed%997))*43758.5453)%1+1)%1*2.6+extra(t);
  const key=t=>`${t.x},${t.y}`,prev=new Map([[key(start),null]]),dist=new Map([[key(start),0]]),steps=new Map([[key(start),0]]),open=[start];let end=null,best=-1;
  while(open.length){
   open.sort((a,b)=>dist.get(key(a))-dist.get(key(b)));const cur=open.shift(),n=steps.get(key(cur));
   if(n>=6&&n<=18&&riverAround(cur).some(p=>s.tile(p.x,p.y)?.kind==='water')){const far=Math.hypot(cur.x-peak.x,cur.y-peak.y);if(far>best){best=far;end=cur;}}
   if(n>=18)continue;
   for(const p of riverAround(cur)){const t=s.tile(p.x,p.y);if(!ok(t))continue;const d=dist.get(key(cur))+cost(t);if(!dist.has(key(t))||d<dist.get(key(t))){dist.set(key(t),d);steps.set(key(t),n+1);prev.set(key(t),cur);if(!open.includes(t))open.push(t);}}
  }
  if(!end)continue;
  const path=[];for(let cur=end;cur;cur=prev.get(`${cur.x},${cur.y}`))path.unshift(cur);
  const sea=riverAround(end).map(p=>s.tile(p.x,p.y)).find(t=>t?.kind==='water');
  return{path,peak,end,sea};
 }
 return null;
}
function layRiver(s,course){
 for(const t of course.path){t.river=true;t.reservedFor='river';}
 const firstBridgeYear=s.river?.firstBridgeYear??null;
 s.river={firstBridgeYear,tiles:course.path.map(t=>`${t.x},${t.y}`),mouth:{x:course.end.x,y:course.end.y},sea:course.sea?{x:course.sea.x,y:course.sea.y}:null,source:{x:course.peak.x,y:course.peak.y}};
 return s.river;
}
function addRiverArm(s){
 const river=s.river,main=river.mainTiles||river.tiles;
 if(main.length<6)return false;
 for(const junctionId of main.slice(2,-2).sort((a,b)=>Math.abs(main.indexOf(a)-main.length*.45)-Math.abs(main.indexOf(b)-main.length*.45))){
  const junction=s.tiles.get(junctionId),parents=new Map([[junctionId,null]]),steps=new Map([[junctionId,0]]),queue=[junction];let best=null,score=0;
  const mx=river.mouth.x-junction.x,my=river.mouth.y-junction.y,len=Math.hypot(mx,my)||1;
  for(let i=0;i<queue.length;i++){
   const t=queue[i],id=`${t.x},${t.y}`,n=steps.get(id),dx=t.x-junction.x,dy=t.y-junction.y;
   if(n>=4&&Math.hypot(t.x-river.mouth.x,t.y-river.mouth.y)>=6&&riverAround(t).some(p=>s.tile(p.x,p.y)?.kind==='water')){
    const value=Math.abs(dx*my-dy*mx)/len-(dx*mx+dy*my)/len*.4;if(value>score){score=value;best=t;}
   }
   if(n>=16)continue;
   for(const p of riverAround(t)){
    const next=s.tile(p.x,p.y),k=`${p.x},${p.y}`;
    if(parents.has(k)||!next||next.kind!=='land'||next.river||next.landform||next.building||next.buildSite||next.reservedFor||next.foundingHome||Math.hypot(next.x,next.y)<=2.5||nearGrounds(s,next))continue;
    parents.set(k,id);steps.set(k,n+1);queue.push(next);
   }
  }
  if(!best)continue;
  const path=[];for(let id=`${best.x},${best.y}`;id;id=parents.get(id))path.unshift(id);
  const sea=riverAround(best).map(p=>s.tile(p.x,p.y)).find(t=>t?.kind==='water');
  for(const id of path){const t=s.tiles.get(id);t.river=true;t.reservedFor='river';}
  river.mainTiles=main.slice();river.branches=[{tiles:path,mouth:{x:best.x,y:best.y},sea:sea?{x:sea.x,y:sea.y}:null}];river.tiles=[...new Set([...main,...path])];return true;
 }
 return false;
}
export function carveRiver(s){
 if(s.river)return s.river;
 const course=findCourse(s,t=>t&&t.kind==='land'&&!t.landform&&!t.building&&!t.reservedFor&&!t.foundingHome&&Math.hypot(t.x,t.y)>2.5);
 if(course){layRiver(s,course);if((s.seed>>>0)%2===0)addRiverArm(s);return s.river;}
 s.river={tiles:[],mouth:null};return s.river;
}
// Grounds that must keep their distance from the river: the castle, the zoo, the theme park and the spaceport.
export function riverGrounds(s){
 const centres=[];if(s.court)centres.push({x:s.court.x,y:s.court.y,r:2});
 for(const [type,g] of Object.entries(s.delightGrounds||{}))if(g)centres.push({x:g.x,y:g.y,r:type==='spaceport'?1:2});
 return centres;
}
export const nearGrounds=(s,t,centres=riverGrounds(s))=>centres.some(c=>Math.max(Math.abs(t.x-c.x),Math.abs(t.y-c.y))<=c.r);
// When an old island has its river running under the castle or another big ground, the river finds a new course
// around it. Homes and fields on the new course make way; the old bed becomes ordinary land again.
export function rerouteRiver(s){
 const river=s.river;if(!river?.tiles?.length)return false;
 const centres=riverGrounds(s);if(!centres.length)return false;
 const clash=river.tiles.some(k=>{const [x,y]=k.split(',').map(Number);return nearGrounds(s,{x,y},centres);});if(!clash)return false;
 const movable=['farm','tree','forest','park','garden','hut','house','townhouse'];
 const ok=t=>t&&t.kind==='land'&&!t.landform&&!t.foundingHome&&!t.buildSite&&!t.plaque&&Math.hypot(t.x,t.y)>2.5&&!nearGrounds(s,t,centres)&&(t.river||!t.reservedFor)&&(!t.building||movable.includes(t.building));
 const course=findCourse(s,ok,t=>t.river?-.5:t.building?(['hut','house','townhouse'].includes(t.building)?5:1.5):0);
 if(!course)return false;
 const newCourse=new Set(course.path.map(t=>`${t.x},${t.y}`));
 for(const k of river.tiles){const t=s.tiles.get(k);if(t){t.river=false;if(!newCourse.has(k))delete t.riverBridge;if(t.reservedFor==='river')t.reservedFor=null;}}
 for(const t of course.path)if(t.building)t.building=null;
 layRiver(s,course);if(river.branches?.length)addRiverArm(s);
 s.log('De rivier zoekt een nieuwe weg, om het kasteel en de grote terreinen heen. Waar ze vroeger stroomde, groeit nu gras.','land',{x:course.end.x,y:course.end.y});
 s.rebuildRoads();
 return true;
}

// Banks are separated until the village can afford a real crossing.
export function advanceRiverBridges(s){
 if(s.ending||s.year<80||s.population<18||s.wood<12||s.year%17!==0||!s.river?.tiles?.length)return false;
 const existing=s.river.tiles.map(id=>s.tiles.get(id)).filter(t=>t?.riverBridge),count=existing.length;
 const arms=[s.river.mainTiles||s.river.tiles,...(s.river.branches||[]).map(a=>a.tiles)],pending=arms.filter(ids=>!ids.some(id=>s.tiles.get(id)?.riverBridge));
 if(count>=3||!pending.length&&s.year<80+count*140)return false;
 const targetArm=pending[0],allBridges=[...s.tiles.values()].filter(t=>t.building==='bridge'||t.riverBridge);
 const bank=t=>t?.kind==='land'&&!t.river&&!t.landform&&t.building!=='original-tree';
 const candidates=[];
 for(const id of s.river.tiles){
  const t=s.tiles.get(id);if(!t||t.kind!=='land'||t.riverBridge||t.landform||t.building||t.buildSite||targetArm&&!targetArm.includes(id)||allBridges.some(b=>Math.hypot(t.x-b.x,t.y-b.y)<4))continue;
  for(const axis of ['x','y']){
   const a=s.tile(t.x-(axis==='x'?1:0),t.y-(axis==='y'?1:0)),b=s.tile(t.x+(axis==='x'?1:0),t.y+(axis==='y'?1:0));
   if(bank(a)&&bank(b)&&(a.walkable||b.walkable||[...riverAround(a),...riverAround(b)].some(p=>s.tile(p.x,p.y)?.walkable)))candidates.push({t,axis,d:Math.hypot(t.x+1,t.y-1)});
  }
 }
 candidates.sort((a,b)=>a.d-b.d);const chosen=candidates[0];if(!chosen)return false;
 const {t,axis}=chosen,first=!s.river.firstBridgeYear;t.riverBridge={axis,year:s.year};s.river.firstBridgeYear??=s.year;s.wood-=12;s.rebuildRoads();
 const text=first?'De eerste brug over de rivier! De bewoners kunnen nu naar de overkant.':'Een nieuwe rivierbrug verbindt de oevers.';
 s.log(text,'bridge',{x:t.x,y:t.y});s.signal('built',t,text,first?{sound:'fanfare',text}:null);return true;
}

export function claimBridgeApproaches(s,bridge,axis){
 let changed=0;
 for(const sign of [-1,1])for(const side of [0,1]){
  const x=bridge.x+(axis==='x'?sign:side),y=bridge.y+(axis==='y'?sign:side),t=s.tile(x,y);
  if(!t||t.kind!=='land'||t.river||t.landform||t.foundingHome||t.plaque||t.castle||t.buildSite||t.district==='heritage'||t.reservedFor&&t.reservedFor!=='bridge-approach')continue;
  if(t.building&&!['hut','house','townhouse','tree','forest','park','garden','flowers'].includes(t.building))continue;
  if(t.building||t.reservedFor!=='bridge-approach'){t.building=null;delete t.futureBuilding;t.reservedFor='bridge-approach';changed++;}
 }
 return changed;
}
