import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS} from '../../public/vr/src/core.js';
import {effectivePresets,initialDecks,readSavedDecks} from '../../public/vr/src/deck-builder.js';

test('deck builder reuses valid decks saved by main and ignores malformed entries',()=>{
 const raw=JSON.stringify({v:2,decks:[{id:'ok',name:'Meu Controle',cards:PRESETS.Controle},{id:'bad',name:'Quebrado',cards:['servo']},null]});
 const saved=readSavedDecks(raw);assert.equal(saved.length,1);assert.equal(saved[0].name,'Meu Controle');assert.deepEqual(saved[0].cards,PRESETS.Controle);
});
test('preset overrides and last VR selection are restored defensively',()=>{
 const custom=PRESETS.Exército.slice().reverse();const presets=effectivePresets(JSON.stringify({v:1,overrides:{Exército:{cards:custom},Animais:{cards:['cao']}}}));
 assert.deepEqual(presets.Exército,custom);assert.deepEqual(presets.Animais,PRESETS.Animais);
 assert.deepEqual(initialDecks(JSON.stringify({v:1,decks:[PRESETS.Bênção,PRESETS.Assassinos]})),[PRESETS.Bênção,PRESETS.Assassinos]);
 assert.deepEqual(initialDecks('{bad json'),[PRESETS.Padrão,PRESETS.Animais]);
});
