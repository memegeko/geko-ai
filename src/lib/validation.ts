import {z} from 'zod';

const id=z.string().min(1).max(180).regex(/^[a-zA-Z0-9][a-zA-Z0-9:_-]*$/);
const short=z.string().trim().min(1).max(100);
const avatar=z.number().int().min(0).max(7);
export const characterSchema=z.object({
 id,name:short,tagline:z.string().max(160),description:z.string().max(1500),
 greeting:z.string().trim().min(1).max(6000),definition:z.string().max(24000),
 category:short,tags:z.array(z.string().max(60)).max(8),avatar,
 creator:z.string().max(100),visibility:z.enum(['private','shared']),
 image:z.string().max(1050000).refine(s=>/^https:\/\//i.test(s)||/^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(s),'Use an HTTPS image or an uploaded PNG, JPEG, WebP, or GIF.').optional(),
 starters:z.array(z.string().max(300)).max(8).optional(),
});
const message=z.object({
 id,role:z.enum(['user','assistant']),content:z.string().max(40000),
 speaker:id.optional(),name:z.string().max(100).optional(),
 variants:z.array(z.string().max(40000)).max(100).optional(),variant:z.number().int().min(0).optional(),
 rating:z.number().int().min(1).max(4).optional(),pinned:z.boolean().optional(),created:z.string().datetime(),
}).refine(m=>m.variant===undefined||!!m.variants&&m.variant<m.variants.length,'Invalid reply variant.');
const chat=z.object({
 id,title:short,characters:z.array(id).min(1).max(2).refine(ids=>new Set(ids).size===ids.length),
 characterSnapshots:z.array(characterSchema).max(2).optional(),messages:z.array(message).max(2000),
 personaId:id.optional(),updated:z.string().datetime(),archived:z.boolean().optional(),isGroup:z.literal(false).optional(),
});
const persona=z.object({id,name:short,description:z.string().max(6000),avatar,isDefault:z.boolean().optional()});
const lorebook=z.object({id,name:short,entries:z.array(z.object({id,name:z.string().max(150),keywords:z.string().max(2000),content:z.string().max(12000),always:z.boolean(),enabled:z.boolean()})).max(500)});
const memory=z.object({id,characterId:id,content:z.string().trim().min(1).max(6000)});
const profile=z.object({id,name:short,bio:z.string().max(500),favorites:z.array(id).max(1000)});
const schemas={character:characterSchema,chat,persona,lorebook,memory,profile};
export function validateRecord(kind:string,value:unknown):any{
 const schema=schemas[kind as keyof typeof schemas];if(!schema)throw new Error('Invalid record type.');
 const result=schema.safeParse(value);
 if(!result.success){const issue=result.error.issues[0];throw new Error(`Invalid ${kind}: ${issue.path.join('.')||'record'} — ${issue.message}`);}
 return result.data;
}
