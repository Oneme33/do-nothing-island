import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {SQUARE_TILES,SQUARE_YEAR,squareTiles} from '../src/square.js';
import {describePlot} from '../src/inspection.js';

test('the plots in front of the first home stay free and become the village square',()=>{
 const s=new Civilization(31);for(const [x,y] of SQUARE_TILES){const t=s.tile(x,y);assert.equal(t.reservedFor,'square');assert.equal(t.building??null,null);}
 while(s.year<SQUARE_YEAR+1)s.tick();assert.equal(squareTiles(s).length,SQUARE_TILES.length);assert.ok(s.history.some(e=>/plein/.test(e.text)));
 while(s.year<900)s.tick();assert.equal(squareTiles(s).length,SQUARE_TILES.length,'nothing is ever built over the square');
 assert.match(describePlot(s,squareTiles(s)[0]),/Dorpsplein/);
});
test('an older save gets a square on free plots or former parks, never over homes',()=>{
 const s=new Civilization(31);while(s.year<300)s.tick();const raw=JSON.parse(s.serialize());delete raw.square;
 const a=SQUARE_TILES[0],b=SQUARE_TILES[1];
 for(const [key,t] of raw.tiles){if(t.x===a[0]&&t.y===a[1]){t.building='park';delete t.reservedFor;}if(t.x===b[0]&&t.y===b[1]){t.building='house';delete t.reservedFor;}}
 const restored=Civilization.restore(JSON.stringify(raw));assert.equal(restored.tile(...a).reservedFor,'square');assert.equal(restored.tile(...b).building,'house');
 restored.tick();assert.equal(restored.tile(...a).building,'town-square');
});
