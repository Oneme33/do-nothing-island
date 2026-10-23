// A river runs from the high ground to the sea. Its tiles stay free of buildings; roads cross it on little bridges.
const riverAround=t=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:t.x+dx,y:t.y+dy}));
export function carveRiver(s){
 if(s.river)return s.river;
 const high=s.land.filter(t=>t.landform).sort((a,b)=>(b.relief||0)-(a.relief||0));
 const ok=t=>t&&t.kind==='land'&&!t.landform&&!t.building&&!t.reservedFor&&!t.foundingHome&&Math.hypot(t.x,t.y)>2.5;
 for(const peak of high){
  const start=riverAround(peak).map(p=>s.tile(p.x,p.y)).find(ok);if(!start)continue;
  // Search the island with uneven costs, so the river meanders instead of running in straight lines like a canal.
  const cost=t=>1+((Math.sin(t.x*12.9898+t.y*78.233+(s.seed%997))*43758.5453)%1+1)%1*2.6;
  const key=t=>`${t.x},${t.y}`,prev=new Map([[key(start),null]]),dist=new Map([[key(start),0]]),steps=new Map([[key(start),0]]),open=[start];let end=null,best=-1;
  while(open.length){
   open.sort((a,b)=>dist.get(key(a))-dist.get(key(b)));const cur=open.shift(),n=steps.get(key(cur));
   if(n>=6&&n<=18&&riverAround(cur).some(p=>s.tile(p.x,p.y)?.kind==='water')){const far=Math.hypot(cur.x-peak.x,cur.y-peak.y);if(far>best){best=far;end=cur;}}
   if(n>=18)continue;
   for(const p of riverAround(cur)){const t=s.tile(p.x,p.y);if(!ok(t))continue;const d=dist.get(key(cur))+cost(t);if(!dist.has(key(t))||d<dist.get(key(t))){dist.set(key(t),d);steps.set(key(t),n+1);prev.set(key(t),cur);if(!open.includes(t))open.push(t);}}
  }
  if(!end)continue;
  const path=[];for(let cur=end;cur;cur=prev.get(`${cur.x},${cur.y}`))path.unshift(cur);
  const cur=end;
  for(const t of path){t.river=true;t.reservedFor='river';}
  const sea=riverAround(cur).map(p=>s.tile(p.x,p.y)).find(t=>t?.kind==='water');
  s.river={tiles:path.map(t=>`${t.x},${t.y}`),mouth:{x:cur.x,y:cur.y},sea:sea?{x:sea.x,y:sea.y}:null,source:{x:peak.x,y:peak.y}};
  return s.river;
 }
 s.river={tiles:[],mouth:null};return s.river;
}
