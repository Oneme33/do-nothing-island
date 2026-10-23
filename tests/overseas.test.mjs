import test from 'node:test';
import assert from 'node:assert/strict';
import {Civilization} from '../src/simulation.js';
import {VISITORS} from '../src/visitors.js';
import {FERRY_YEAR} from '../src/islets.js';
import {FAMOUS,DIG_YEAR} from '../src/famous.js';
import {museumExhibits} from '../src/museum.js';
import {readAlbum,albumMoment,addPhoto,albumCaption,ALBUM_MAX} from '../src/album.js';

const lived=new Civilization(77);while(lived.year<2150&&!lived.ending)lived.tick();

test('visitors from overseas arrive in their own time, leave again and are logged',()=>{
 const seen=lived.visitors.history;assert.ok(seen.length>=6);
 for(const v of seen)assert.ok(v.year>=VISITORS.find(d=>d.kind===v.kind).since,v.kind);
 assert.ok(['balloon','zeppelin','cruise'].every(kind=>seen.some(v=>v.kind===kind)),'modern visitors come too');
 assert.ok(lived.history.some(e=>e.type==='visitor'&&/handelsschip/.test(e.text)));
});

test('the islets on the horizon get a ferry and slowly fill with houses',()=>{
 const isles=lived.islets;assert.equal(isles.list.length,2);assert.ok(isles.ferry>=FERRY_YEAR);
 for(const islet of isles.list){assert.equal(islet.houses,islet.cap);assert.ok(Math.hypot(islet.x,islet.y)>15,'beyond the grid');}
 const early=new Civilization(77);while(early.year<FERRY_YEAR-1)early.tick();assert.equal(early.islets.ferry,null);assert.ok(early.islets.list.every(i=>i.houses===0));
});

test('famous residents get a plaque on their home and an exhibit in the museum',()=>{
 assert.equal(lived.famous.length,FAMOUS.length);
 for(const f of lived.famous)assert.equal(lived.tile(f.x,f.y).plaque?.id,f.id);
 const exhibits=museumExhibits(lived);
 assert.ok(exhibits.some(e=>e.kind==='Beroemde eilander'));assert.ok(exhibits.some(e=>e.kind==='Opgraving'));assert.ok(exhibits.some(e=>e.kind==='Bezoek'));
});

test('archaeologists dig only after 1890, on a reserved plot that is given back afterwards',()=>{
 const finds=lived.digs.finds;assert.ok(finds.length>=4);assert.ok(finds.every(f=>f.year>DIG_YEAR));
 assert.equal(new Set(finds.map(f=>f.id)).size,finds.length);
 for(const f of finds){const t=lived.tile(f.x,f.y);assert.notEqual(t.reservedFor,'dig');assert.ok(!t.dig);}
 const s=new Civilization(77);while(!s.digs?.site&&s.year<2100)s.tick();
 const site=s.tile(s.digs.site.x,s.digs.site.y);assert.equal(site.reservedFor,'dig');assert.ok(!site.building);assert.equal(s.planBuilding(site,'house'),false);
});

test('everything new survives a save',()=>{
 const restored=Civilization.restore(lived.serialize());
 assert.deepEqual(restored.islets,lived.islets);assert.deepEqual(restored.famous,lived.famous);assert.deepEqual(restored.digs,lived.digs);assert.deepEqual(restored.visitors,lived.visitors);
});

test('the photo album keeps big moments for this island only, and stays small',()=>{
 assert.deepEqual(readAlbum('{"seed":1,"photos":[{"year":3,"src":"x","caption":"a"}]}',2).photos,[]);
 assert.equal(readAlbum('not json',2).photos.length,0);
 const album={seed:5,photos:[]};
 assert.equal(albumMoment(album,[{type:'life',year:10,priority:35}]),null);
 const first=albumMoment(album,[{type:'life',year:10},{type:'delight',year:10,priority:83}]);assert.equal(first.type,'delight');
 addPhoto(album,{year:10,src:'a',caption:'eerste'});
 assert.equal(albumMoment(album,[{type:'delight',year:20,priority:83}]),null,'small moments wait twenty years');
 assert.ok(albumMoment(album,[{type:'age',year:20,priority:92}]),'turning points always get a photo');
 for(let i=0;i<ALBUM_MAX+5;i++)addPhoto(album,{year:40+i,src:'b',caption:'c'});
 assert.equal(album.photos.length,ALBUM_MAX);assert.equal(album.photos[0].caption,'eerste');
 assert.equal(albumCaption('Een zin. Nog een zin.'),'Een zin.');
});
