export function registerTools(api){
 const context=document.modelContext;if(!context?.registerTool)return;
 const lifecycle=new AbortController();
 const definitions=[
  {name:'read_match',description:'Read the local VR match visible state; opponent hidden cards are redacted.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>api.getState()},
  {name:'play_match_card',description:'Play or move an eligible local player card into lane 0, 1 or 2.',inputSchema:{type:'object',properties:{cardId:{type:'string'},lane:{type:'integer',minimum:0,maximum:2}},required:['cardId','lane'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>api.command('play-lane',input)},
  {name:'end_match_turn',description:'Commit the local player plan, run the bot and start the reveal queue.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute:()=>api.command('end-turn')},
  {name:'reset_match_plan',description:'Undo only the local player unrevealed placements from the current round and refund their energy.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute:()=>api.command('reset')}
 ];
 for(const tool of definitions){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
