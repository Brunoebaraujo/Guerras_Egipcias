import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MatchCore,DECKS,PRESETS,validateDeck,validateDecks} from '../../public/vr/src/core.js';
import {freshMatch,applyAction,isAimable} from '../../public/vr/game-core/src/match/index.js';
import {ctxOf,laneScore,matchResult} from '../../public/vr/game-core/src/domain/engine.js';
import {runBotPlanning} from '../../public/vr/game-core/src/match/bots/controller.js';
import {decideFacil} from '../../public/vr/game-core/src/domain/bots/index.js';
import {createRng} from '../../public/vr/game-core/src/domain/rng.js';

test('vendored engine files match their recorded main hashes',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../../public/vr/game-core/provenance.json',import.meta.url)));
 assert.equal(manifest.commit,'30f6e39f75a9c4fcfdc1f987694dac3b0c7ae39f');
 for(const [path,hash] of Object.entries(manifest.files)){const data=await readFile(new URL('../../public/vr/game-core/'+path,import.meta.url));assert.equal(createHash('sha256').update(data).digest('hex'),hash,path);}
});
test('reset refunds only this round, invalid lanes fail, unrevealed power does not count',()=>{
 const c=new MatchCore({seed:123}),s=c.snapshot(),id=s.hand.find(id=>c.validSlots(id).length);
 assert.equal(c.command('play-lane',{cardId:id,lane:9}).ok,false);
 assert.equal(c.command('play-lane',{cardId:id,lane:0}).ok,true);assert.deepEqual(c.powers(),[0,0,0]);
 assert.equal(Object.keys(c.snapshot().board)[0],'p-0-0');
 assert.equal(c.command('reset').ok,true);assert.equal(c.snapshot().energy,s.energy);assert.equal(c.snapshot().hand.length,s.hand.length);
});
test('player and bot decks are chosen independently before a match',()=>{
 for(const [name,deck] of Object.entries(PRESETS))assert.equal(validateDeck(deck).ok,true,name);
 const decks=[PRESETS.Controle,PRESETS.Animais],c=new MatchCore({seed:19,decks}),initial=c.snapshot();
 assert.ok(initial.cards.filter(card=>card.zone==='hand').every(card=>decks[0].includes(card.key)));
 assert.equal(validateDeck(decks[0]).ok,true);assert.equal(validateDecks(decks).ok,true);
 const before=JSON.stringify(initial);assert.equal(c.command('new-match',{decks:[['servo'],decks[1]]}).ok,false);assert.equal(JSON.stringify(c.snapshot()),before);
 assert.equal(c.command('end-turn').ok,true);for(let i=0;c.snapshot().phase!=='plan'&&i<80;i++)c.tick(1);
 const botCards=c.snapshot().cards.filter(card=>card.owner===1&&card.zone==='board');assert.ok(botCards.length>0);assert.ok(botCards.every(card=>decks[1].includes(card.key)));
 const replacement=[PRESETS.Exército,PRESETS.Sacrifício];assert.equal(c.command('new-match',{decks:replacement}).ok,true);assert.ok(c.snapshot().cards.filter(card=>card.zone==='hand').every(card=>replacement[0].includes(card.key)));
});
test('full matches against bot agree with direct main engine, including queue and final result',()=>{
 for(let seed=0;seed<40;seed++){
  const c=new MatchCore({seed});let ref=freshMatch(DECKS,{seed});const rng=createRng(`${seed}:bot`);
  const apply=action=>{const r=applyAction(ref,action);assert.ok(!r.error,r.error);ref=r.state;};
  let n=0;
  while(!ref.finished&&n++<250){
   if(ref.phase==='plan'){
    for(const h of [...ref.hand[0]]){const lane=[seed%3,(seed+1)%3,(seed+2)%3].find(lane=>!applyAction(ref,{t:'place',side:0,hid:h.hid,lane}).error);if(lane!==undefined){assert.equal(c.command('play-lane',{cardId:'h-'+h.hid,lane}).ok,true);apply({t:'place',side:0,hid:h.hid,lane});}}
    ref=runBotPlanning({state:ref,side:1,decide:decideFacil,rng}).state;apply({t:'startReveal'});assert.equal(c.command('end-turn').ok,true);
    for(const card of c.snapshot().cards.filter(x=>x.owner===1&&!x.revealed)){assert.equal(card.hidden,true);assert.equal(card.key,null);assert.equal(card.power,null);}
    assert.equal(c.command('end-turn').ok,false);
   }else if(ref.awaitingAim?.side===0){apply({t:'skipAim'});assert.equal(c.command('skip-aim').ok,true);}
   else {
    let action;if(ref.awaitingAim){const targets=ref.board.filter(card=>isAimable(ref,card));action=targets.length?{t:'aim',targetUid:targets[Math.floor(rng()*targets.length)].uid}:{t:'skipAim'};}
    else action={t:ref.awaitingPlagueShowcase?'ackPlagueShowcase':ref.phase==='revealed'?'nextRound':'step'};
    apply(action);c.tick(1);
   }
   const snap=c.snapshot();assert.equal(snap.turn,ref.round);assert.equal(snap.phase,ref.phase);assert.equal(snap.queue.remaining,ref.queue.length);
   assert.deepEqual(snap.powers,[0,1,2].map(l=>laneScore(ctxOf(ref),l,0)));assert.deepEqual(snap.opponentPower,[0,1,2].map(l=>laneScore(ctxOf(ref),l,1)));
   assert.equal(new Set(Object.values(snap.board)).size,Object.keys(snap.board).length);assert.ok(snap.cards.length<=31);
   for(const side of [0,1])for(const lane of [0,1,2]){const cells=snap.cards.filter(card=>card.zone==='board'&&card.owner===side&&Number(card.slot.split('-')[1])===lane).map(card=>Number(card.slot.split('-')[2])).sort((a,b)=>a-b);assert.deepEqual(cells,Array.from({length:cells.length},(_,i)=>i));}
  }
  assert.ok(ref.finished,'seed '+seed+' stalled');assert.deepEqual(c.snapshot().result,matchResult(ref));assert.equal(c.snapshot().turn,6);
  assert.equal(c.command('reset').ok,false);assert.equal(c.command('new-match').ok,true);assert.equal(c.snapshot().turn,1);assert.equal(Object.keys(c.snapshot().board).length,0);
 }
});
test('revealed Escaravelho can move once on a following round and does not duplicate',()=>{
 const c=new MatchCore({seed:123});const card=c.snapshot().cards.find(c=>c.key==='escaravelho'),servo=c.snapshot().cards.find(c=>c.key==='servo');
 c.command('play-lane',{cardId:servo.id,lane:0});c.command('play-lane',{cardId:card.id,lane:0});c.command('end-turn');for(let i=0;c.snapshot().phase!=='plan'&&i<50;i++)c.tick(1);
 const b=c.snapshot().cards.find(c=>c.key==='escaravelho'&&c.owner===0);assert.ok(b.movable);assert.ok(c.command('play-lane',{cardId:b.id,lane:1}).ok);
 const moved=c.snapshot();assert.equal(moved.cards.filter(c=>c.id===b.id).length,1);assert.equal(c.validSlots(b.id).length,0);assert.equal(moved.cards.find(card=>card.key==='servo'&&card.owner===0).slot,'p-0-0');assert.equal(moved.cards.find(card=>card.id===b.id).slot,'p-1-0');
});
