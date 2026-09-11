// This local adapter is deliberately independent of Three.js and input devices.
// Replace it with a server/core adapter implementing the same command contract.
export const CARDS = Object.freeze([
  {id:'anubis',name:'ANÚBIS',subtitle:'Guardião do além',cost:4,power:5,glyph:'☥'},
  {id:'warrior',name:'GUERREIRO',subtitle:'Lâmina de Kemet',cost:3,power:3,glyph:'⚔'},
  {id:'priestess',name:'SACERDOTISA',subtitle:'Voz do templo',cost:2,power:4,glyph:'☾'},
  {id:'scarab',name:'ESCARAVELHO',subtitle:'O sol renasce',cost:1,power:3,glyph:'◈'},
  {id:'storm',name:'TEMPESTADE',subtitle:'Fúria solar',cost:4,power:4,glyph:'☀'}
].map(Object.freeze));
export const SLOT_IDS = Object.freeze(Array.from({length:12},(_,i)=>`p-${Math.floor(i/4)}-${i%4}`));
export class SandboxCore extends EventTarget {
  constructor(){super();this.reset();}
  snapshot(){return structuredClone(this.state);}
  emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail:structuredClone(detail)}));}
  reset(){this.state={turn:1,energy:6,deck:15,hand:CARDS.map(c=>c.id),board:{},opponentPower:[0,0,0],ended:false};this.emit('state:changed',this.state);return {ok:true};}
  validSlots(cardId){const c=CARDS.find(c=>c.id===cardId);return c && !this.state.ended && this.state.hand.includes(cardId) && c.cost<=this.state.energy ? SLOT_IDS.filter(id=>!this.state.board[id]):[];}
  command(type,payload={}){
    this.emit('intent',{type,payload});
    let result;
    if(type==='play-card'){
      if(!this.validSlots(payload.cardId).includes(payload.slotId))result={ok:false,reason:this.state.ended?'Turno encerrado. Reinicie para testar novamente.':'Espaço inválido ou energia insuficiente.'};
      else{
        const c=CARDS.find(c=>c.id===payload.cardId);
        this.state.board[payload.slotId]=c.id;this.state.hand=this.state.hand.filter(id=>id!==c.id);this.state.energy-=c.cost;
        this.emit('card:played',{...payload,power:c.power,cost:c.cost});result={ok:true};
      }
    }else if(type==='reset'){return this.reset();}
    else if(type==='end-turn'){
      if(this.state.ended)result={ok:false,reason:'O turno já terminou. Reinicie para jogar novamente.'};
      else {this.state.ended=true;this.emit('turn:ended',this.state);result={ok:true};}
    }else result={ok:false,reason:'Comando desconhecido.'};
    if(result.ok)this.emit('state:changed',this.state);else this.emit('command:rejected',{type,payload,...result});
    return result;
  }
  powers(){const out=[0,0,0];for(const [id,c] of Object.entries(this.state.board))out[Number(id.split('-')[1])]+=CARDS.find(card=>card.id===c).power;return out;}
}
