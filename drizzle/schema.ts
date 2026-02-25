import { pgTable, text, integer, uuid, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
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

export const regions = pgTable(
  'regions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    aesthetics: text('aesthetics'),
    promptNarrative: text('prompt_narrative'),
    promptImage: text('prompt_image'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (t) => ({
    regionsSlugUnique: uniqueIndex('regions_slug_unique').on(t.slug)
  })
);

export const factions = pgTable(
  'factions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    motto: text('motto'),
    description: text('description'),
    promptBase: text('prompt_base'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (t) => ({
    factionsSlugUnique: uniqueIndex('factions_slug_unique').on(t.slug)
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
    gender: text('gender').notNull(),
    traits: jsonb('traits').$type<Record<string, unknown>>().default({}),
    professionSlug: text('profession_slug'),
    currentRegionSlug: text('current_region_slug'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (t) => ({
    charactersStoryUserUnique: uniqueIndex('characters_story_user').on(t.storyId, t.userId),
    charactersStoryIdx: index('idx_characters_story').on(t.storyId)
  })
);

export const professions = pgTable(
  'professions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    clothingDescription: text('clothing_description').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (t) => ({
    professionsSlugUnique: uniqueIndex('professions_slug_unique').on(t.slug)
  })
);

export const characterFactions = pgTable(
  'character_factions',
  {
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    factionId: uuid('faction_id')
      .notNull()
      .references(() => factions.id, { onDelete: 'cascade' }),
    isPrimary: boolean('is_primary').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (t) => ({
    characterFactionUnique: uniqueIndex('character_faction_unique').on(t.characterId, t.factionId),
    characterPrimaryIdx: index('idx_character_primary').on(t.characterId)
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
    regionSlug: text('region_slug'),
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

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  storyId: uuid('story_id')
    .notNull()
    .references(() => stories.id, { onDelete: 'cascade' }),
  sceneId: uuid('scene_id').references(() => scenes.id, { onDelete: 'set null' }),
  userId: text('user_id').notNull(),
  regionSlug: text('region_slug'),
  factionSlug: text('faction_slug'),
  diceRoll: integer('dice_roll').notNull(),
  diceCategory: text('dice_category').notNull(),
  eventType: text('event_type').notNull(),
  eventSubtype: text('event_subtype'),
  payload: jsonb('payload').$type<Record<string, unknown>>().default({}),
  outcome: text('outcome'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true })
});
