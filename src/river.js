// A river runs from the high ground to the sea. Its tiles stay free of buildings; roads cross it on little bridges.
const riverAround=t=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:t.x+dx,y:t.y+dy}));
export function carveRiver(s){
 if(s.river)return s.river;
 const high=s.land.filter(t=>t.landform).sort((a,b)=>(b.relief||0)-(a.relief||0));
 const ok=t=>t&&t.kind==='land'&&!t.landform&&!t.building&&!t.reservedFor&&!t.foundingHome&&Math.hypot(t.x,t.y)>2.5;
 for(const peak of high){
  const start=riverAround(peak).map(p=>s.tile(p.x,p.y)).find(ok);if(!start)continue;
  // Search the island and flow to a coast well away from the mountain, through free ground only.
  const prev=new Map([[`${start.x},${start.y}`,null]]),dist=new Map([[`${start.x},${start.y}`,0]]),queue=[start];let end=null,best=-1;
  for(let q=0;q<queue.length;q++){const cur=queue[q],d=dist.get(`${cur.x},${cur.y}`);
   if(d>=5&&d<=16&&riverAround(cur).some(p=>s.tile(p.x,p.y)?.kind==='water')){const far=Math.hypot(cur.x-peak.x,cur.y-peak.y);if(far>best){best=far;end=cur;}}
   if(d>=16)continue;
   for(const p of riverAround(cur)){const t=s.tile(p.x,p.y),k=`${p.x},${p.y}`;if(ok(t)&&!dist.has(k)){dist.set(k,d+1);prev.set(k,cur);queue.push(t);}}
  }
  if(!end)continue;
  const path=[];for(let cur=end;cur;cur=prev.get(`${cur.x},${cur.y}`))path.unshift(cur);
  const cur=end;
  for(const t of path){t.river=true;t.reservedFor='river';}
  s.river={tiles:path.map(t=>`${t.x},${t.y}`),mouth:{x:cur.x,y:cur.y}};
  return s.river;
 }
 s.river={tiles:[],mouth:null};return s.river;
}
