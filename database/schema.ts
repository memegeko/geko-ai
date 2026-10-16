import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  kind: text('kind').notNull(),
  data: text('data').notNull(),
  updated: text('updated').notNull(),
}, t => [index('records_owner_kind').on(t.owner,t.kind)]);
export const config = sqliteTable('config', {
  id: text('id').primaryKey(),
  value: text('value').notNull(),
});

export const groupRooms = sqliteTable('group_rooms', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  ownerName: text('owner_name').notNull(),
  guest: text('guest'),
  guestName: text('guest_name'),
  title: text('title').notNull(),
  characters: text('characters').notNull(),
  snapshots: text('snapshots').notNull(),
  invite: text('invite').notNull().unique(),
  ownerPersona: text('owner_persona'),
  guestPersona: text('guest_persona'),
  updated: text('updated').notNull(),
  generation: text('generation'),
  generationUser: text('generation_user'),
  generationUntil: text('generation_until'),
}, t => [index('group_rooms_owner').on(t.owner),index('group_rooms_guest').on(t.guest)]);
export const groupMessages = sqliteTable('group_messages', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull(),
  author: text('author').notNull(),
  data: text('data').notNull(),
  created: text('created').notNull(),
}, t => [index('group_messages_room_created').on(t.groupId,t.created)]);
