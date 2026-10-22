// Every island earns a name and a flag from its seed and, once it has one, its character.
const NAME_PARTS={
 none:['Nooitgedacht','Boomrust','Wolkenrijk','Schelpenoog','Lantaarnoog','Kribbeland'],
 harbor:['Ankerhof','Zeewaard','Meeuwenoord','Kribbeland'],
 garden:['Groenoog','Tuinewaard','Knolrijk','Bloesemhoek'],
 inventor:['Knutseloog','Ketelhaven','Vonkenrijk','Tandwielerwaard'],
 builder:['Hoogmoed','Torenwaard','Steenrijk','Dakkerland']
};
const NAME_PREFIX=['','Lutje ','Groot ','Oud ','Klein ','Nieuw '];
const FLAG_STYLE={none:['#5f7f63','#f1ead2','tree'],harbor:['#3f5f7a','#f3efe2','anchor'],garden:['#6f8f4f','#f3e9c8','leaf'],inventor:['#b07a3a','#e9e1c8','gear'],builder:['#a35a45','#efe2c6','tower']};
const idHash=n=>{let x=(n>>>0)^0x9e3779b9;x=Math.imul(x^(x>>>16),0x45d9f3b);return(x^(x>>>16))>>>0;};
export function islandIdentity(s){
 const kind=NAME_PARTS[s.character]?s.character:'none',h=idHash(s.seed||1),parts=NAME_PARTS[kind];
 const [main,second,symbol]=FLAG_STYLE[kind];
 return{name:NAME_PREFIX[h%NAME_PREFIX.length]+parts[(h>>>4)%parts.length],kind,main,second,symbol,stripe:(h>>>8)%2===0};
}
const SYMBOLS={
 tree:'<circle cx="15" cy="9" r="4"/><rect x="14.3" y="11" width="1.4" height="5"/>',
 anchor:'<path d="M15 5v11M12 8h6M10 12c1 3 9 3 10 0" fill="none" stroke-width="1.6"/>',
 leaf:'<path d="M10 15c0-6 5-9 10-9-1 6-4 9-10 9Z"/>',
 gear:'<circle cx="15" cy="10.5" r="4.2" fill="none" stroke-width="2.4" stroke-dasharray="2 1.3"/>',
 tower:'<path d="M12 16V8h2v2h2V8h2v8Z"/>'
};
export function flagSVG(id,size=18){
 const fill=id.second,stroke=id.second;
 return `<svg class="island-flag" width="${size*1.5}" height="${size}" viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="${id.main}"/>${id.stripe?`<rect y="15" width="30" height="5" fill="${id.second}" opacity=".75"/>`:`<rect width="6" height="20" fill="${id.second}" opacity=".75"/>`}<g fill="${fill}" stroke="${stroke}">${SYMBOLS[id.symbol]}</g></svg>`;
}
