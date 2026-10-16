import type {Character,Chat,Persona,Lorebook,Memory} from './types';
export function buildPrompt(character:Character,chat:Chat,persona?:Persona,lorebooks:Lorebook[]=[],memories:Memory[]=[]) {
 const group=chat.isGroup||chat.characters.length>1;
 const recent=chat.messages.slice(-12).map(m=>m.content).join('\n').toLowerCase();
 const lore=lorebooks.flatMap(b=>b.entries.filter(e=>e.enabled&&(e.always||e.keywords.split(',').some(k=>k.trim()&&recent.includes(k.trim().toLowerCase())))).map(e=>`${e.name}: ${e.content}`)).join('\n');
 const pinned=chat.messages.filter(m=>m.pinned).map(m=>`${m.name||m.role}: ${m.content}`).join('\n');
 return [{role:'system',content:[`You are ${character.name}. This is an AI character conversation. Stay distinct and consistent, respond to the latest message, advance the conversation naturally, and avoid repeating previous phrasing. Never write the user's dialogue or actions.`,character.description,character.definition,persona?`User persona: ${persona.name}\n${persona.description}`:'',lore?`Relevant lore:\n${lore}`:'',memories.length?`User-maintained long-term memories:\n${memories.map(m=>m.content).join('\n')}`:'',pinned?`Pinned context:\n${pinned}`:'',group?'This is a group conversation. Speak ONLY for your character. Other named speakers are separate participants.':''].filter(Boolean).join('\n\n')},...chat.messages.slice(-60).filter(m=>m.content.trim()).map(m=>({role:m.role==='assistant'&&m.speaker===character.id?'assistant':'user',content:group?`${m.name||m.role}: ${m.content}`:m.content}))];
}
