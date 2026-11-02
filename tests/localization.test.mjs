import test from 'node:test';
import assert from 'node:assert/strict';
import {translate,setLanguage,getLanguage,refreshLocalization,localizeCanvasContext} from '../src/localization.js';
import {englishCatalog} from '../src/english.js';

test('Dutch and English switch the game name and existing story text without changing saved text',()=>{
 setLanguage('nl');assert.equal(getLanguage(),'nl');assert.equal(translate('Do Nothing Island'),'Doe Niks Eiland');
 const saved='The island would like to take all the credit.';
 assert.equal(translate(saved),'Het eiland neemt graag alle eer op zich.');
 setLanguage('en');assert.equal(translate(saved),saved);assert.equal(translate('Doe Niks Eiland'),'Do Nothing Island');
 assert.equal(translate('Bewaar dit eiland'),'Keep this island');assert.equal(translate('Bouw'),'Build');assert.equal(translate('OUDE WERELD'),'ANCIENT WORLD');assert.equal(translate('Otis de Vries'),'Otis de Vries');assert.equal(translate('Help Roos'),'Help Roos');
 setLanguage('nl');
});
test('the full English catalog preserves dynamic placeholders and contains the interface and story texts',()=>{
 assert.ok(Object.keys(englishCatalog).length>1000);
 for(const [source,target] of Object.entries(englishCatalog)){
  assert.equal(typeof target,'string');assert.ok(target.trim());
  assert.deepEqual(new Set(target.match(/\{\d+\}/g)||[]),new Set(source.match(/\{\d+\}/g)||[]),source);
 }
 setLanguage('en');assert.match(translate('Jaar 85'),/Year/);assert.match(translate('De eerste brug over de rivier! De bewoners kunnen nu naar de overkant.'),/first bridge/);setLanguage('nl');
});
test('DOM text and accessible labels restore their original Dutch text when switching back',()=>{
 const text={nodeType:3,nodeValue:'Bewaar dit eiland'};
 const attrs={'aria-label':'Bewaar dit eiland'};
 const root={nodeType:1,tagName:'BUTTON',childNodes:[text],getAttribute:k=>attrs[k],setAttribute:(k,v)=>attrs[k]=v,hasAttribute:()=>false};
 setLanguage('en');refreshLocalization(root);assert.equal(text.nodeValue,'Keep this island');assert.equal(attrs['aria-label'],'Keep this island');
 setLanguage('nl');refreshLocalization(root);assert.equal(text.nodeValue,'Bewaar dit eiland');assert.equal(attrs['aria-label'],'Bewaar dit eiland');
});
test('canvas labels and exported cards use the selected language and keep measurement in sync',()=>{
 const drawn=[],context={fillText:(text,x,y)=>drawn.push([text,x,y]),measureText:text=>({width:text.length})};
 localizeCanvasContext(context);localizeCanvasContext(context);setLanguage('en');context.fillText('Doe Niks Eiland',3,4);
 assert.deepEqual(drawn[0],['Do Nothing Island',3,4]);assert.equal(context.measureText('Bouw').width,5);
 setLanguage('nl');context.fillText('Do Nothing Island',3,4);assert.equal(drawn[1][0],'Doe Niks Eiland');
});
