import test from 'node:test';
import assert from 'node:assert/strict';
import {SandboxCore,SLOT_IDS} from '../../public/vr/src/core.js';
test('24 physical slots, 12 player targets; initial economy and five cards',()=>{
  const core=new SandboxCore();assert.equal(SLOT_IDS.length,12);assert.equal(core.state.hand.length,5);assert.equal(core.state.energy,6);assert.equal(core.state.deck,15);
});
test('Anubis consumes energy once, contributes power and cannot be played twice',()=>{
  const c=new SandboxCore();assert.equal(c.command('play-card',{cardId:'anubis',slotId:'p-1-0'}).ok,true);assert.equal(c.state.energy,2);assert.deepEqual(c.powers(),[0,5,0]);
  assert.equal(c.command('play-card',{cardId:'anubis',slotId:'p-0-0'}).ok,false);assert.equal(c.state.energy,2);
});
test('invalid, occupied, opponent and unaffordable destinations do not mutate state',()=>{
  const c=new SandboxCore();for(const slotId of ['o-1-0','p-5-0',null]){const before=c.snapshot();assert.equal(c.command('play-card',{cardId:'anubis',slotId}).ok,false);assert.deepEqual(c.snapshot(),before);}
  c.command('play-card',{cardId:'anubis',slotId:'p-0-0'});
  for(const payload of [{cardId:'scarab',slotId:'p-0-0'},{cardId:'warrior',slotId:'p-1-0'}]){const before=c.snapshot();assert.equal(c.command('play-card',payload).ok,false);assert.deepEqual(c.snapshot(),before);}
});
test('end turn locks play; reset restores exactly the starting sandbox',()=>{
  const c=new SandboxCore(),initial=c.snapshot();c.command('play-card',{cardId:'scarab',slotId:'p-2-2'});c.command('end-turn');assert.deepEqual(c.validSlots('anubis'),[]);assert.equal(c.command('end-turn').ok,false);c.command('reset');assert.deepEqual(c.snapshot(),initial);
});
test('event payloads and snapshots cannot change authoritative state',()=>{
  const c=new SandboxCore();let played=0;c.addEventListener('card:played',()=>played++);c.addEventListener('state:changed',e=>{e.detail.energy=999;});c.command('play-card',{cardId:'scarab',slotId:'p-2-3'});assert.equal(played,1);assert.equal(c.state.energy,5);const s=c.snapshot();s.hand.length=0;assert.equal(c.state.hand.length,4);
});
