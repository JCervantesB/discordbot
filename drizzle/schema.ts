import { pgTable, text, integer, uuid, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { index, uniqueIndex } from 'drizzle-orm/pg-core';

export const stories = pgTable(
  'stories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: text('guild_id').notNull().unique(),
    title: text('title').default('Historia Colaborativa'),
    status: text('status').default('active'),
    sceneCount: integer('scene_count').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (t) => ({
    storiesGuildIdx: uniqueIndex('idx_stories_guild').on(t.guildId)
  })
);

export const characters = pgTable(
  'characters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    userName: text('user_name').notNull(),
    characterName: text('character_name').notNull(),
    description: text('description').notNull(),
    traits: jsonb('traits').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (t) => ({
    charactersStoryUserUnique: uniqueIndex('characters_story_user').on(t.storyId, t.userId),
    charactersStoryIdx: index('idx_characters_story').on(t.storyId)
  })
);

export const scenes = pgTable(
  'scenes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    sceneNumber: integer('scene_number').notNull(),
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
    userId: text('user_id').notNull(),
    userPrompt: text('user_prompt').notNull(),
    narrative: text('narrative').notNull(),
    imageUrl: text('image_url'),
    location: text('location'),
    transitionType: text('transition_type').default('main'),
    contextUsed: jsonb('context_used').$type<number[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (t) => ({
    scenesStoryOrderIdx: index('idx_scenes_story_order').on(t.storyId, t.sceneNumber),
    scenesStoryCreatedIdx: index('idx_scenes_created').on(t.storyId, t.createdAt),
    scenesStoryNumberUnique: uniqueIndex('scenes_story_scene_number_unique').on(
      t.storyId,
      t.sceneNumber
    )
  })
);
