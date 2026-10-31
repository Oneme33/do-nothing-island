// The night sky remembers what the island's visitor did most. Pure scenery, no simulation state.
const constellationCatalog={
 hand:{name:'De Grote Hand',stars:[[0,.42],[-.34,.08],[-.48,-.22],[-.22,-.12],[-.04,-.38],[.16,-.16],[.42,-.27],[.32,.04],[.08,.22]],lines:[[0,1],[0,2],[0,4],[0,6],[0,8],[1,2],[2,3],[4,5],[6,7],[7,8]]},
 bucket:{name:'De Brandende Emmer',stars:[[-.28,.28],[-.18,-.26],[.2,-.26],[.3,.28],[-.28,.28],[0,.52],[0,.8]],lines:[[0,1],[1,2],[2,3],[3,0],[5,6],[5,4]]},
 cloud:{name:'De Regenwolk',stars:[[-.4,.12],[-.22,-.14],[.04,-.22],[.3,-.1],[.4,.14],[-.12,.24],[.18,.22],[-.02,.62]],lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[2,6],[6,7]]},
 mountain:{name:'De Bevende Berg',stars:[[-.5,.3],[-.2,-.36],[.02,-.08],[.2,-.24],[.48,.3],[-.18,.18],[.16,.16]],lines:[[0,1],[1,2],[2,3],[3,4],[4,0],[1,5],[3,6]]},
 rescuer:{name:'De Helpende Hand',stars:[[0,.34],[-.3,.06],[-.44,-.2],[-.18,-.1],[0,-.3],[.18,-.1],[.36,-.2],[.3,.06],[-.02,.54]],lines:[[0,1],[0,2],[0,4],[0,6],[0,8],[1,2],[4,5],[6,7]]},
 house:{name:'Het Eerste Huis',stars:[[-.32,.3],[.32,.3],[.32,-.12],[0,-.38],[-.32,-.12],[-.32,.3],[0,.04]],lines:[[0,1],[1,2],[2,3],[3,4],[4,0],[0,6],[6,1]]},
 tree:{name:'De Oude Eik',stars:[[0,.5],[0,.12],[-.28,-.12],[.28,-.12],[-.12,-.32],[.12,-.32],[0,-.5]],lines:[[0,1],[1,2],[1,3],[2,4],[3,5],[4,6],[5,6]]},
 circle:{name:'De Steencirkel',stars:[[0,-.4],[.34,-.2],[.34,.2],[0,.4],[-.34,.2],[-.34,-.2],[-.18,-.52]],lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,6],[6,5]]}
};
const constellationKinds=[
 ['fire','bucket'],['rain','cloud'],['nudge','hand'],['rumble','mountain'],['rescues','rescuer']
];
export function constellationsFor(s){
 const count=s?.interferences||0;if(count<8)return[];
 const influence=s.influence||{};
 const dominant=[...constellationKinds].sort((a,b)=>(influence[b[0]]||0)-(influence[a[0]]||0))[0];
 const first=influence[dominant[0]]>0?dominant[1]:'house';
 const list=[constellationCatalog[first]];
 const second=s.origin?.id==='stone-circle'?'circle':s.origin?.id==='ancient-oak'?'tree':'house';
 if(count>=18&&second!==first)list.push(constellationCatalog[second]);
 return list;
}
