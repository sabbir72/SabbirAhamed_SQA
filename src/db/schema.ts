import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const portfolioMeta = pgTable('portfolio_meta', {
  id: text('id').primaryKey().default('main'),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  profile: jsonb('profile').$type<Record<string, unknown>>().notNull().default({}),
  skills: jsonb('skills').$type<Array<Record<string, unknown>>>().notNull().default([]),
  referencesList: jsonb('references_list').$type<Array<Record<string, unknown>>>().notNull().default([]),
  careerRoadmap: jsonb('career_roadmap').$type<Array<Record<string, unknown>>>().notNull().default([]),
  blogCategories: jsonb('blog_categories').$type<string[]>().notNull().default([]),
  deletedProjectIds: jsonb('deleted_project_ids').$type<string[]>().notNull().default([]),
  deletedExperienceIds: jsonb('deleted_experience_ids').$type<string[]>().notNull().default([]),
  deletedBlogIds: jsonb('deleted_blog_ids').$type<string[]>().notNull().default([]),
  deletedReferenceIds: jsonb('deleted_reference_ids').$type<string[]>().notNull().default([]),
  deletedRoadmapIds: jsonb('deleted_roadmap_ids').$type<string[]>().notNull().default([]),
  themeId: text('theme_id').notNull().default('cyber-cyan'),
  vcardConfig: jsonb('vcard_config').$type<Record<string, unknown>>().notNull().default({}),
  vcardPrivacy: jsonb('vcard_privacy').$type<Record<string, unknown>>().notNull().default({}),
  vcardTeam: jsonb('vcard_team').$type<Array<Record<string, unknown>>>().notNull().default([]),
  lastModifiedIso: text('last_modified_iso').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  orderIndex: integer('order_index').notNull().default(0),
  title: text('title').notNull(),
  type: text('type').notNull().default('Automation'),
  description: text('description').notNull().default(''),
  metrics: jsonb('metrics').$type<Array<{ label: string; value: string }>>().notNull().default([]),
  assertions: jsonb('assertions')
    .$type<Array<{ name: string; status: string; duration: string }>>()
    .notNull()
    .default([]),
  logs: jsonb('logs')
    .$type<Array<{ timestamp: string; level: string; message: string }>>()
    .notNull()
    .default([]),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  link: text('link').notNull().default(''),
  image: text('image').notNull().default(''),
  updatedAtIso: text('updated_at_iso').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const experiences = pgTable('experiences', {
  id: text('id').primaryKey(),
  orderIndex: integer('order_index').notNull().default(0),
  role: text('role').notNull(),
  company: text('company').notNull(),
  period: text('period').notNull().default(''),
  location: text('location').notNull().default(''),
  highlights: jsonb('highlights').$type<string[]>().notNull().default([]),
  updatedAtIso: text('updated_at_iso').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const blogs = pgTable('blogs', {
  id: text('id').primaryKey(),
  orderIndex: integer('order_index').notNull().default(0),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  category: text('category').notNull().default('Software Testing'),
  description: text('description').notNull().default(''),
  content: text('content').notNull().default(''),
  coverImage: text('cover_image').notNull().default(''),
  publishDate: text('publish_date').notNull().default(''),
  readingTime: text('reading_time').notNull().default('5 min read'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  featured: boolean('featured').notNull().default(false),
  status: text('status').notNull().default('Published'),
  author: jsonb('author').$type<Record<string, unknown>>().notNull().default({}),
  updatedAtIso: text('updated_at_iso').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contactMessages = pgTable('contact_messages', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('new'),
  createdAtIso: text('created_at_iso').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const bugReports = pgTable('bug_reports', {
  id: text('id').primaryKey(),
  visibility: text('visibility').notNull().default('public'),
  title: text('title').notNull(),
  project: text('project').notNull().default('SaaS E-Commerce Platform'),
  severity: text('severity').notNull().default('Major'),
  description: text('description').notNull().default(''),
  stepsToReproduce: jsonb('steps_to_reproduce').$type<string[]>().notNull().default([]),
  expectedResult: text('expected_result').notNull().default(''),
  actualResult: text('actual_result').notNull().default(''),
  status: text('status').notNull().default('Open'),
  createdAtIso: text('created_at_iso').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const visitorStats = pgTable('visitor_stats', {
  id: text('id').primaryKey().default('main'),
  totalVisitors: integer('total_visitors').notNull().default(0),
  totalPageViews: integer('total_page_views').notNull().default(0),
  todayDate: text('today_date').notNull(),
  todayVisitors: integer('today_visitors').notNull().default(0),
  sessions: jsonb('sessions').$type<string[]>().notNull().default([]),
  uniqueVisitors: jsonb('unique_visitors').$type<string[]>().notNull().default([]),
  todayVisitorsList: jsonb('today_visitors_list').$type<string[]>().notNull().default([]),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  portfolioMetaEntries: many(portfolioMeta),
}));

export const portfolioMetaRelations = relations(portfolioMeta, ({ one }) => ({
  owner: one(users, {
    fields: [portfolioMeta.ownerId],
    references: [users.id],
  }),
}));
