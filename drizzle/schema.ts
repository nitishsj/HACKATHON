import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const queueTickets = mysqlTable("queueTickets", {
  id: int("id").autoincrement().primaryKey(),
  accessKey: varchar("accessKey", { length: 64 }).notNull().unique(),
  patientName: varchar("patientName", { length: 80 }).notNull(),
  patientPhone: varchar("patientPhone", { length: 20 }),
  preferredLanguage: mysqlEnum("preferredLanguage", ["en", "hi", "ta", "te"]).default("en").notNull(),
  smsOptIn: int("smsOptIn").default(0).notNull(),
  approachingSmsClaimedAt: timestamp("approachingSmsClaimedAt"),
  smsApproachingSentAt: timestamp("smsApproachingSentAt"),
  twilioMessageSid: varchar("twilioMessageSid", { length: 34 }),
  smsLastErrorCode: varchar("smsLastErrorCode", { length: 16 }),
  isDemo: int("isDemo").default(0).notNull(),
  smsDeliveryStatus: varchar("smsDeliveryStatus", { length: 24 }).default("none").notNull(),
  smsStatusUpdatedAt: timestamp("smsStatusUpdatedAt"),
  status: mysqlEnum("status", ["waiting", "called", "in_consultation", "completed", "no_show"]).default("waiting").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  queuedAt: timestamp("queuedAt").defaultNow().notNull(),
  calledAt: timestamp("calledAt"),
  consultationStartedAt: timestamp("consultationStartedAt"),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QueueTicket = typeof queueTickets.$inferSelect;
export type InsertQueueTicket = typeof queueTickets.$inferInsert;

export const queueEvents = mysqlTable("queueEvents", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull().references(() => queueTickets.id, { onDelete: "cascade" }),
  eventType: varchar("eventType", { length: 32 }).notNull(),
  previousStatus: varchar("previousStatus", { length: 32 }),
  nextStatus: varchar("nextStatus", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QueueEvent = typeof queueEvents.$inferSelect;
