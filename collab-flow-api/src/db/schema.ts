import { pgTable, uuid, varchar, text, timestamp, integer, pgEnum, index } from 'drizzle-orm/pg-core'

// Enums
export const userRoleEnum = pgEnum(`user_role`, [`admin`, `member`, `guest`])
export const userStatusEnum = pgEnum(`user_status`, [`active`, `inactive`, `suspended`])
export const taskStatusEnum = pgEnum(`task_status`, [`backlog`, `todo`, `inprogress`, `done`])

// Users table
export const users = pgTable(`users`, {
  id: uuid(`id`).primaryKey().defaultRandom(),
  googleUserId: varchar(`google_user_id`, { length: 255 }).unique(),
  name: varchar(`name`, { length: 255 }).notNull(),
  email: varchar(`email`, { length: 255 }).notNull().unique(),
  avatar: text(`avatar`),
  role: userRoleEnum(`role`).notNull().default(`member`),
  title: varchar(`title`, { length: 255 }),
  organization: varchar(`organization`, { length: 255 }),
  status: userStatusEnum(`status`).notNull().default(`active`),
  lastLogin: timestamp(`last_login`, { withTimezone: true }),
  createdAt: timestamp(`created_at`, { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp(`updated_at`, { withTimezone: true }).notNull().defaultNow()
})

// Projects table
export const projects = pgTable(`projects`, {
  id: uuid(`id`).primaryKey().defaultRandom(),
  name: varchar(`name`, { length: 255 }).notNull(),
  description: text(`description`).notNull().default(``),
  createdAt: timestamp(`created_at`, { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp(`updated_at`, { withTimezone: true }).notNull().defaultNow()
})

// Tasks table
export const tasks = pgTable(`tasks`, {
  id: uuid(`id`).primaryKey().defaultRandom(),
  projectId: uuid(`project_id`).notNull().references(() => projects.id, { onDelete: `cascade` }),
  assigneeId: uuid(`assignee_id`).references(() => users.id, { onDelete: `set null` }),
  title: varchar(`title`, { length: 255 }).notNull(),
  description: text(`description`),
  status: taskStatusEnum(`status`).notNull().default(`backlog`),
  order: integer(`order`).notNull().default(0),
  createdAt: timestamp(`created_at`, { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp(`updated_at`, { withTimezone: true }).notNull().defaultNow()
}, table => ([
  index(`tasks_project_id_idx`).on(table.projectId),
  index(`tasks_assignee_id_idx`).on(table.assigneeId),
  index(`tasks_status_idx`).on(table.status)
]))

// Sessions table (used by google-oauth-backend for session storage)
export const sessions = pgTable(`sessions`, {
  sid: varchar(`sid`, { length: 255 }).primaryKey(),
  userId: uuid(`user_id`).references(() => users.id, { onDelete: `cascade` }),
  data: text(`data`).notNull(),
  expiresAt: timestamp(`expires_at`, { withTimezone: true }).notNull()
}, table => ([
  index(`sessions_user_id_idx`).on(table.userId),
  index(`sessions_expires_at_idx`).on(table.expiresAt)
]))
