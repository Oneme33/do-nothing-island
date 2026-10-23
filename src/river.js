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
 s.river={tiles:course.path.map(t=>`${t.x},${t.y}`),mouth:{x:course.end.x,y:course.end.y},sea:course.sea?{x:course.sea.x,y:course.sea.y}:null,source:{x:course.peak.x,y:course.peak.y}};
 return s.river;
}
export function carveRiver(s){
 if(s.river)return s.river;
 const course=findCourse(s,t=>t&&t.kind==='land'&&!t.landform&&!t.building&&!t.reservedFor&&!t.foundingHome&&Math.hypot(t.x,t.y)>2.5);
 if(course)return layRiver(s,course);
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
 for(const k of river.tiles){const t=s.tiles.get(k);if(t){t.river=false;if(t.reservedFor==='river')t.reservedFor=null;}}
 for(const t of course.path)if(t.building)t.building=null;
 layRiver(s,course);
 s.log('De rivier zoekt een nieuwe weg, om het kasteel en de grote terreinen heen. Waar ze vroeger stroomde, groeit nu gras.','land',{x:course.end.x,y:course.end.y});
 s.rebuildRoads();
 return true;
}
