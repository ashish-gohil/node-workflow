import * as z from "zod";

/* ------------------------------------------------------------------ */
/*  Sub-schemas per mode                                               */
/* ------------------------------------------------------------------ */

const IntervalSchedulerSchema = z.object({
  mode: z.literal("interval"),
  every: z.number().min(1, "Must be at least 1"),
  unit: z.enum(["seconds", "minutes", "hours"]),
  startAt: z.string().optional().describe("ISO datetime — when to start firing"),
  endAt: z.string().optional().describe("ISO datetime — when to stop firing"),
});

const DailySchedulerSchema = z.object({
  mode: z.literal("daily"),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:MM (00:00 - 23:59)")
    .describe("Time of day to fire"),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
});

const WeeklySchedulerSchema = z.object({
  mode: z.literal("weekly"),
  days: z
    .array(z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]))
    .min(1, "Select at least one day"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:MM (00:00 - 23:59)"),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
});

const CronSchedulerSchema = z.object({
  mode: z.literal("cron"),
  cronExpression: z
    .string()
    .min(1, "Cron expression is required")
    .describe("Standard 5-part cron expression"),
  timezone: z.string().optional().describe("IANA timezone, e.g. Asia/Kolkata"),
});

/* ------------------------------------------------------------------ */
/*  Root schema — discriminated on mode                               */
/* ------------------------------------------------------------------ */

export const SchedulerTriggerSchema = z.discriminatedUnion("mode", [
  IntervalSchedulerSchema,
  DailySchedulerSchema,
  WeeklySchedulerSchema,
  CronSchedulerSchema,
]);

export type SchedulerTrigger = z.infer<typeof SchedulerTriggerSchema>;

/* ------------------------------------------------------------------ */
/*  UI metadata                                                        */
/* ------------------------------------------------------------------ */

export const SchedulerTriggerUIMeta = {
  nodeType: "schedulerTrigger",
  displayName: "Schedule Trigger",
  icon: "Clock",
  category: "trigger",
  description: "Fire the workflow on a time-based schedule",
  fields: {
    mode: {
      label: "Schedule mode",
      widget: "select",
      default: "interval",
      options: [
        { label: "Interval", value: "interval" },
        { label: "Daily", value: "daily" },
        { label: "Weekly", value: "weekly" },
        { label: "Cron", value: "cron" },
      ],
    },

    // — interval fields —
    every: {
      label: "Every",
      widget: "number",
      width: "half",
      default: 5,
      showWhen: { field: "mode", in: ["interval"] },
    },
    unit: {
      label: "Unit",
      widget: "select",
      width: "half",
      default: "minutes",
      options: [
        { label: "Seconds", value: "seconds" },
        { label: "Minutes", value: "minutes" },
        { label: "Hours", value: "hours" },
      ],
      showWhen: { field: "mode", in: ["interval"] },
    },

    // — daily / weekly shared —
    time: {
      label: "Time (HH:MM)",
      widget: "text",
      width: "half",
      placeholder: "09:00",
      showWhen: { field: "mode", in: ["daily", "weekly"] },
    },

    // — weekly only —
    days: {
      label: "Days of week",
      widget: "multiSelect",
      width: "full",
      options: [
        { label: "Monday", value: "monday" },
        { label: "Tuesday", value: "tuesday" },
        { label: "Wednesday", value: "wednesday" },
        { label: "Thursday", value: "thursday" },
        { label: "Friday", value: "friday" },
        { label: "Saturday", value: "saturday" },
        { label: "Sunday", value: "sunday" },
      ],
      showWhen: { field: "mode", in: ["weekly"] },
    },

    // — cron only —
    cronExpression: {
      label: "Cron expression",
      widget: "text",
      width: "full",
      placeholder: "0 9 * * 1-5",
      showWhen: { field: "mode", in: ["cron"] },
    },
    timezone: {
      label: "Timezone",
      widget: "text",
      width: "full",
      placeholder: "Asia/Kolkata",
      showWhen: { field: "mode", in: ["cron"] },
    },

    // — shared optional range (all modes except cron) —
    startAt: {
      label: "Start at",
      widget: "dateTimePicker",
      width: "half",
      showWhen: { field: "mode", notIn: ["cron"] },
    },
    endAt: {
      label: "End at",
      widget: "dateTimePicker",
      width: "half",
      showWhen: { field: "mode", notIn: ["cron"] },
    },
  },
};
