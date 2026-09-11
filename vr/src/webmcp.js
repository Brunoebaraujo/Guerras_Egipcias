export function registerTools(api){
  const context=document.modelContext;if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const tools=[
    {name:'read_sandbox',description:'Read the current Guerras Egípcias VR sandbox hand, energy and board.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>api.getState()},
    {name:'play_sandbox_card',description:'Play a card from the hand in a valid player slot. Spends local sandbox energy.',inputSchema:{type:'object',properties:{cardId:{type:'string'},slotId:{type:'string'}},required:['cardId','slotId'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||typeof input.cardId!=='string'||typeof input.slotId!=='string')return {ok:false,reason:'cardId and slotId are required strings'};return api.command('play-card',{cardId:input.cardId,slotId:input.slotId});}},
    {name:'reset_sandbox',description:'Reset the sandbox: remove played cards, restore the five-card hand and six energy.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute:()=>api.command('reset')}
  ];
  for(const tool of tools){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Experimental API; never block the game. */}}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
