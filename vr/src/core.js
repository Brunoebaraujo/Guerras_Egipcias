// Presentation adapter. Rules and bot decisions are unmodified modules from main.
import {freshMatch,applyAction,isAimable} from '../game-core/src/match/index.js';
import {CARDS,byKey,ctxOf,laneScore,laneWins,matchResult,power,custoDe} from '../game-core/src/domain/engine.js';
import {decideFacil} from '../game-core/src/domain/bots/index.js';
import {runBotPlanning} from '../game-core/src/match/bots/controller.js';
import {createRng,randomSeed} from '../game-core/src/domain/rng.js';
export const DECKS=Object.freeze([
 ['servo','arqueiro','lanceiro','carruagem','guardareal','montu','hathor','escaravelho','heka','mumia','sobek','anubis'],
 ['cao','cabra-nilo','ganso','gato','macaco','hiena','garca','rebanho','domador','apis','amon','escaravelho']
]);
export const DECK_SIZE=12;
export const PRESETS=Object.freeze({
 'Padrão':['montu','carruagem','guardareal','armadura','escaravelho','heh','enxame','mumia','sobek','hathor','set','selo'],
 'Exército':['servo','arqueiro','escaravelho','heka','lanceiro','carruagem','enxame','montu','guardareal','amon','general','colosso'],
 'Sacrifício':['servo','bennu','mumia','armadura','heka','sobek','enxame','sekhmet','apofis','osiris','diluvio','amheh'],
 'Controle':['anubis','maat','selo','sekhmet','amon','hathor','montu','osiris','guardareal','colosso','general','set'],
 'Bênção':['renenutet','hathor','heka','armadura','servo','arqueiro','lanceiro','carruagem','guardareal','escaravelho','montu','amon'],
 'Assassinos':['servo','arqueiro','sicario','heka','senti','enxame','hemsu','montu','semerj','akhu','general','seqer-mau'],
 'Pragas':['moises','servo','arqueiro','lanceiro','carruagem','guardareal','general','montu','armadura','hathor','escaravelho','selo'],
 'Animais':['cao','cabra-nilo','ganso','gato','macaco','hiena','garca','rebanho','domador','apis','amon','escaravelho'],
});
export const CARD_CATALOG=Object.freeze(CARDS.map(d=>Object.freeze({key:d.key,name:d.nome,cost:d.custo,power:d.poder,type:d.tipo,arch:d.arch,art:d.arte||d.key,text:d.texto||'Sem efeito.'})).sort((a,b)=>a.cost-b.cost||a.name.localeCompare(b.name)));
const SELECTABLE=new Set(CARD_CATALOG.map(card=>card.key));
export function validateDeck(deck){if(!Array.isArray(deck)||deck.length!==DECK_SIZE)return {ok:false,reason:`Cada deck precisa ter exatamente ${DECK_SIZE} cartas.`};if(new Set(deck).size!==deck.length)return {ok:false,reason:'Um deck não pode ter cartas repetidas.'};const unknown=deck.find(key=>!SELECTABLE.has(key));return unknown?{ok:false,reason:`Carta desconhecida no deck: ${unknown}.`}:{ok:true};}
export function validateDecks(decks){if(!Array.isArray(decks)||decks.length!==2)return {ok:false,reason:'Escolha o seu deck e o deck do bot.'};for(const deck of decks){const result=validateDeck(deck);if(!result.ok)return result;}return {ok:true};}
export const SLOT_IDS=Object.freeze(Array.from({length:12},(_,i)=>`p-${Math.floor(i/4)}-${i%4}`));
export class MatchCore extends EventTarget {
 #state; #slots=new Map(); #botRng; #wait=0; #revealTotal=0; #seed; #decks;
 constructor({seed=randomSeed(),decks=DECKS}={}){super();this.newMatch(seed,decks);}
 emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail:structuredClone(detail)}));}
 newMatch(seed=randomSeed(),decks=this.#decks||DECKS){const valid=validateDecks(decks);if(!valid.ok)return valid;this.#decks=decks.map(deck=>deck.slice());this.#seed=seed;this.#state=freshMatch(this.#decks,{seed});this.#botRng=createRng(`${seed}:bot`);this.#slots.clear();this.#wait=0;this.#revealTotal=0;this.changed();return {ok:true};}
 changed(){this.assignSlots();this.emit('state:changed',this.snapshot());}
 assignSlots(){
  const s=this.#state;
  this.#slots.clear();
  for(const side of [0,1])for(const lane of [0,1,2]){
   const ordered=s.board.filter(c=>!c.dying&&c.owner===side&&c.lane===lane);
   ordered.forEach((c,index)=>this.#slots.set(c.uid,`${side?'o':'p'}-${lane}-${index}`));
  }
 }
 powers(){return [0,1,2].map(l=>laneScore(ctxOf(this.#state),l,0));}
 snapshot(){
  const s=this.#state,ctx=ctxOf(s),board={},cards=[];
  const describe=(c,id,hidden=false)=>{const d=hidden?null:byKey[c.key];return {id,key:d?.key??null,name:d?.nome??'Carta oculta',text:d?.texto||'Sem efeito.',cost:d?custoDe(c):null,power:d?(c.uid?power(c,ctx):c.printed+(c.baked||0)):null,hidden};};
  for(const h of s.hand[0])cards.push({...describe(h,'h-'+h.hid),zone:'hand'});
  for(const c of s.board.filter(c=>!c.dying)){
   const id='b-'+c.uid,slot=this.#slots.get(c.uid);if(!slot)continue;board[slot]=id;
   cards.push({...describe(c,id,c.owner===1&&!c.revealed),zone:'board',slot,active:s.lastReveal?.uid===c.uid,owner:c.owner,revealed:c.revealed,aimable:s.awaitingAim?.side===0&&isAimable(s,c),movable:this.moveLanes(c.uid).length>0,pickup:s.phase==='plan'&&!s.finished&&c.owner===0&&!c.revealed&&c.enteredRound===s.round});
  }
  const aim=s.awaitingAim;
  return {seed:this.#seed,turn:s.round,phase:s.phase,energy:s.energy[0],deck:s.deck[0].length,opponentDeck:s.deck[1].length,opponentHand:s.hand[1].length,hand:s.hand[0].map(h=>'h-'+h.hid),cards,board,opponentPower:[0,1,2].map(l=>laneScore(ctx,l,1)),powers:this.powers(),wins:laneWins(s),priority:s.priority,ended:s.finished,result:s.finished?matchResult(s):null,queue:{remaining:s.queue.length,total:this.#revealTotal,items:s.queue.map(uid=>s.board.find(c=>c.uid===uid)).filter(Boolean).map(c=>({owner:c.owner,lane:c.lane,name:c.owner===0||c.revealed?byKey[c.key].nome:'Carta oculta'}))},aim:aim?{side:aim.side,name:aim.srcNome,needs:aim.needs}:null,lastReveal:s.lastReveal?('b-'+s.lastReveal.uid):null,effect:s.phase==='revealing'?s.effect?.text||'':'',message:this.message()};
 }
 message(){const s=this.#state;if(s.finished){const r=matchResult(s);return `${r.side===-1?'EMPATE':r.side===0?'VOCÊ VENCEU':'O BOT VENCEU'} · ${laneWins(s).join(' × ')} vias${r.tiebreak?' · desempate por poder':''}`;}if(s.awaitingAim?.side===0)return `Escolha um alvo ${s.awaitingAim.needs==='ally'?'aliado':'inimigo'} iluminado.`;if(s.phase==='revealing')return `Revelando · ${s.queue.length} na fila${s.effect?.text?' · '+s.effect.text:''}`;if(s.phase==='revealed')return 'Resolvendo o fim da rodada…';return `Rodada ${s.round}/6 · ${s.energy[0]} energia · selecione carta e via.`;}
 moveLanes(uid){const s=this.#state;if(s.phase!=='plan'||s.finished)return [];const c=s.board.find(c=>c.uid===uid&&c.owner===0&&c.revealed);if(!c)return [];return [0,1,2].filter(lane=>lane!==c.lane&&!applyAction(s,{t:'move',side:0,uid,lane}).error);}
 validSlots(id){const s=this.#state;if(s.phase!=='plan'||s.finished)return [];let lanes=[];
  if(id?.startsWith('h-'))lanes=[0,1,2].filter(lane=>!applyAction(s,{t:'place',side:0,hid:Number(id.slice(2)),lane}).error);
  else if(id?.startsWith('b-'))lanes=this.moveLanes(Number(id.slice(2)));
  return SLOT_IDS.filter(slot=>lanes.includes(Number(slot.split('-')[1]))&&![...this.#slots.values()].includes(slot));
 }
 nextSlot(id,lane){return this.validSlots(id).find(s=>s.startsWith(`p-${lane}-`))??null;}
 apply(action){const r=applyAction(this.#state,action);if(r.error)return {ok:false,reason:r.error};this.#state=r.state;return {ok:true};}
 command(type,payload={}){
  this.emit('intent',{type,payload});let result;
  if(type==='new-match')return this.newMatch(randomSeed(),payload.decks||this.#decks);
  if(this.#state.finished)return {ok:false,reason:'Partida encerrada. Selecione NOVA PARTIDA.'};
  if(type==='play-lane'){
   const {cardId,lane}=payload;if(!Number.isInteger(lane)||!this.nextSlot(cardId,lane))return {ok:false,reason:'Via indisponível ou energia insuficiente.'};
   result=this.apply(cardId.startsWith('h-')?{t:'place',side:0,hid:Number(cardId.slice(2)),lane}:{t:'move',side:0,uid:Number(cardId.slice(2)),lane});
  }else if(type==='pickup')result=this.apply({t:'pickup',side:0,uid:Number(payload.cardId?.slice(2))});
  else if(type==='reset')result=this.apply({t:'resetPlan',side:0});
  else if(type==='aim'&&this.#state.awaitingAim?.side===0)result=this.apply({t:'aim',targetUid:Number(payload.cardId?.slice(2))});
  else if(type==='skip-aim'&&this.#state.awaitingAim?.side===0)result=this.apply({t:'skipAim'});
  else if(type==='end-turn'&&this.#state.phase==='plan'){
   const planned=runBotPlanning({state:this.#state,side:1,decide:decideFacil,rng:this.#botRng});
   if(planned.stopped!=='done')return {ok:false,reason:'O bot não concluiu o planejamento.'};
   this.#state=planned.state;result=this.apply({t:'startReveal'});this.#revealTotal=this.#state.queue.length;this.#wait=.8;
  }else result={ok:false,reason:'Aguarde a revelação terminar.'};
  if(result.ok){this.changed();this.emit('command:applied',{type,payload});}else this.emit('command:rejected',{type,payload,...result});return result;
 }
 tick(delta){const s=this.#state;if(s.finished||s.phase==='plan'||s.awaitingAim?.side===0)return;
  this.#wait-=Math.max(0,delta);if(this.#wait>0)return;this.#wait=.85;let action;
  if(s.awaitingAim){const targets=s.board.filter(c=>isAimable(s,c));action=targets.length?{t:'aim',targetUid:targets[Math.floor(this.#botRng()*targets.length)].uid}:{t:'skipAim'};}
  else if(s.awaitingPlagueShowcase)action={t:'ackPlagueShowcase'};
  else action={t:s.phase==='revealed'?'nextRound':'step'};
  const result=this.apply(action);if(!result.ok){this.emit('runtime:error',result);return;}this.changed();
 }
}
