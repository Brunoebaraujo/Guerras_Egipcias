import {CARD_CATALOG,DECK_SIZE,PRESETS,validateDecks} from './core.js?v=1.0.0';

const SELECTION_KEY='ge_vr_deck_selection';
const byKey=new Map(CARD_CATALOG.map(card=>[card.key,card]));

function parseJson(raw,fallback){try{return raw?JSON.parse(raw):fallback;}catch{return fallback;}}
export function readSavedDecks(raw){
 const store=parseJson(raw,{decks:[]});
 if(!Array.isArray(store?.decks))return [];
 return store.decks.filter(deck=>typeof deck?.name==='string'&&validateDecks([deck.cards,PRESETS.Animais]).ok).slice(0,20).map(deck=>({name:deck.name,cards:deck.cards.slice()}));
}
export function effectivePresets(raw){
 const parsed=parseJson(raw,{}),overrides=parsed?.overrides&&typeof parsed.overrides==='object'?parsed.overrides:parsed;
 return Object.fromEntries(Object.entries(PRESETS).map(([name,cards])=>{
  const custom=overrides?.[name]?.cards;
  return [name,validateDecks([custom,PRESETS.Animais]).ok?custom.slice():cards.slice()];
 }));
}
export function initialDecks(raw){
 const parsed=parseJson(raw,null),decks=parsed?.decks;
 return validateDecks(decks).ok?decks.map(deck=>deck.slice()):[PRESETS.Padrão.slice(),PRESETS.Animais.slice()];
}

export function createDeckBuilder({root,onStart,storage=globalThis.localStorage}){
 const tabs=[root.querySelector('[data-side="0"]'),root.querySelector('[data-side="1"]')];
 const presetsEl=root.querySelector('#deck-presets'),savedEl=root.querySelector('#saved-decks'),selectedEl=root.querySelector('#selected-cards'),grid=root.querySelector('#card-grid');
 const search=root.querySelector('#card-search'),count=root.querySelector('#deck-count'),sideName=root.querySelector('#deck-side-name'),message=root.querySelector('#deck-message'),start=root.querySelector('#start-match');
 const presets=effectivePresets(storage?.getItem?.('ge_preset_overrides'));
 const saved=readSavedDecks(storage?.getItem?.('ge_decks'));
 let decks=initialDecks(storage?.getItem?.(SELECTION_KEY)),side=0,query='';
 function flash(text){message.textContent=text;message.hidden=!text;}
 function persist(){try{storage?.setItem?.(SELECTION_KEY,JSON.stringify({v:1,decks}));}catch{}}
 function setDeck(cards,label){decks[side]=cards.slice();persist();flash(`${label} carregado no ${side?'deck do bot':'seu deck'}.`);render();}
 function toggle(key){
  const deck=decks[side],index=deck.indexOf(key);
  if(index>=0)deck.splice(index,1);else if(deck.length<DECK_SIZE)deck.push(key);else{flash('Deck completo. Retire uma carta antes de adicionar outra.');return;}
  persist();flash('');render();
 }
 function renderChoices(){
  presetsEl.replaceChildren(...Object.entries(presets).map(([name,cards])=>choiceButton(name,()=>setDeck(cards,`Preset ${name}`))));
  savedEl.replaceChildren(...saved.map(deck=>choiceButton(deck.name,()=>setDeck(deck.cards,`Deck ${deck.name}`))));
  root.querySelector('#saved-group').hidden=!saved.length;
 }
 function choiceButton(label,action){const button=document.createElement('button');button.className='deck-chip';button.textContent=label;button.onclick=action;return button;}
 function renderSelected(){
  selectedEl.replaceChildren(...decks[side].map((key,index)=>{const card=byKey.get(key),button=document.createElement('button');button.className='selected-card';button.innerHTML=`<span>${index+1}</span><strong>${card?.name||key}</strong><small>${card?.cost??'?'}⚡ · P${card?.power??'?'}</small>`;button.onclick=()=>toggle(key);button.title='Retirar do deck';return button;}));
 }
 function renderGrid(){
  const needle=query.trim().toLocaleLowerCase('pt-BR');
  const cards=CARD_CATALOG.filter(card=>!needle||`${card.name} ${card.type} ${card.text}`.toLocaleLowerCase('pt-BR').includes(needle));
  grid.replaceChildren(...cards.map(card=>{
   const selected=decks[side].includes(card.key),button=document.createElement('button');button.className='catalog-card'+(selected?' selected':'');button.setAttribute('aria-pressed',String(selected));
   const img=document.createElement('img');img.loading='lazy';img.alt='';img.onerror=()=>{const fallback=document.createElement('span');fallback.className='catalog-art-fallback';fallback.textContent='☥';img.replaceWith(fallback);};img.src=new URL(`../card-art/${card.art}.webp`,import.meta.url).href;
   const body=document.createElement('span');body.className='catalog-copy';body.innerHTML=`<strong>${card.name}</strong><small>${card.cost}⚡ · P${card.power} · ${card.type}</small><em>${card.text}</em>`;
   const mark=document.createElement('b');mark.className='catalog-mark';mark.textContent=selected?String(decks[side].indexOf(card.key)+1):'＋';button.append(img,body,mark);button.onclick=()=>toggle(card.key);return button;
  }));
 }
 function render(){
  tabs.forEach((tab,index)=>{tab.classList.toggle('active',index===side);tab.setAttribute('aria-selected',String(index===side));tab.querySelector('span').textContent=`${decks[index].length}/${DECK_SIZE}`;});
  sideName.textContent=side?'DECK DO BOT':'SEU DECK';count.textContent=`${decks[side].length}/${DECK_SIZE}`;count.classList.toggle('complete',decks[side].length===DECK_SIZE);
  start.disabled=!validateDecks(decks).ok;renderSelected();renderGrid();
 }
 tabs.forEach((tab,index)=>tab.onclick=()=>{side=index;flash('');render();});
 search.oninput=()=>{query=search.value;renderGrid();};
 root.querySelector('#random-deck').onclick=()=>setDeck([...CARD_CATALOG].sort(()=>Math.random()-.5).slice(0,DECK_SIZE).map(card=>card.key),'Deck aleatório');
 root.querySelector('#clear-deck').onclick=()=>setDeck([],'Deck vazio');
 start.onclick=()=>{const valid=validateDecks(decks);if(!valid.ok){flash(valid.reason);return;}persist();const result=onStart(decks.map(deck=>deck.slice()));if(result?.ok===false){flash(result.reason);return;}root.hidden=true;document.body.classList.add('match-ready');};
 renderChoices();render();
 return {open(){root.hidden=false;document.body.classList.remove('match-ready');render();},getDecks:()=>decks.map(deck=>deck.slice())};
}
