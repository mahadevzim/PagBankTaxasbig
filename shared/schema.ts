import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  role: text("role", { enum: ["admin", "consultant"] }).notNull().default("consultant"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  cnpj: text("cnpj").notNull().unique(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  size: text("size").notNull(),
  activity: text("activity"),
  openDate: text("open_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  cnpj: text("cnpj").notNull(),
  companyName: text("company_name").notNull(),
  companySize: text("company_size").notNull(),
  consultantId: integer("consultant_id").references(() => users.id),
  consultantName: text("consultant_name").notNull(),
  phone: text("phone"),
  pixRate: text("pix_rate").notNull().default("0.00"),
  debitRate: text("debit_rate").notNull().default("0.51"),
  creditRate: text("credit_rate").notNull().default("1.01"),
  credit12xRate: text("credit_12x_rate").notNull().default("1.29"),
  anticipationRate: text("anticipation_rate").notNull().default("2.49"),
  status: text("status", { enum: ["draft", "sent", "approved", "rejected"] }).notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  cnpj: text("cnpj").notNull(),
  companyName: text("company_name").notNull(),
  phone: text("phone"),
  consultantId: integer("consultant_id").references(() => users.id),
  status: text("status", { enum: ["pending", "assigned", "converted", "completed"] }).notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  role: true,
});

export const insertCompanySchema = createInsertSchema(companies).pick({
  cnpj: true,
  name: true,
  status: true,
  size: true,
  activity: true,
  openDate: true,
});

export const insertProposalSchema = z.object({
  cnpj: z.string(),
  companyName: z.string(),
  companySize: z.string().optional(),
  consultantId: z.number(),
  consultantName: z.string(),
  pixRate: z.string(),
  debitRate: z.string(),
  creditRate: z.string(),
  credit12xRate: z.string(),
  anticipationRate: z.string(),
  status: z.enum(["draft", "sent", "approved", "rejected"]).default("draft"),
});

export const insertLeadSchema = createInsertSchema(leads).pick({
  cnpj: true,
  companyName: true,
  phone: true,
  consultantId: true,
  status: true,
  notes: true,
});

export const insertSettingSchema = createInsertSchema(settings).pick({
  key: true,
  value: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposals.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

export const whatsappTemplateSchema = z.object({
  template: z.string(),
});