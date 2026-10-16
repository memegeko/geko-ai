export type Character = {id:string;name:string;tagline:string;description:string;greeting:string;definition:string;category:string;tags:string[];avatar:number;image?:string;creator:string;owner?:string;visibility:'shared'|'private';likes?:number;featured?:boolean;starters?:string[]};
export type Message = {id:string;role:'user'|'assistant';content:string;speaker?:string;name?:string;variants?:string[];variant?:number;rating?:number;pinned?:boolean;created:string;userId?:string;pending?:boolean;generationBy?:string};
export type Chat = {id:string;title:string;characters:string[];characterSnapshots?:Character[];messages:Message[];personaId?:string;updated:string;archived?:boolean;isGroup?:boolean;ownerId?:string;members?:{id:string;name:string;persona?:{name:string;description:string}}[];inviteToken?:string;generating?:boolean};
export type Persona = {id:string;name:string;description:string;avatar:number;isDefault?:boolean};
export type Lorebook = {id:string;name:string;entries:{id:string;name:string;keywords:string;content:string;always:boolean;enabled:boolean}[]};
export type Memory = {id:string;characterId:string;content:string};
export type Profile = {id:string;name:string;bio:string;favorites:string[]};
export type Connection = {url:string;model:string;temperature:number;context:number;configured?:boolean;hasToken?:boolean};
