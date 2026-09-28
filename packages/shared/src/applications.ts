import { z } from "zod";

export const APPLICATION_STATUSES = [
  "Applied",
  "Phone Screen",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
] as const;

export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

/** A job application as stored and returned by the API. */
export type Application = {
  pk: string;
  sk: string;
  company: string;
  position: string;
  location: string;
  status: ApplicationStatus;
  /** YYYY-MM-DD */
  dateApplied: string;
  url: string;
  source: string;
  salaryRange: string;
  contact: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

// Missing, null and "" all mean "not filled in".
const optionalText = z
  .string()
  .nullish()
  .transform((value) => value ?? "");

/** Body of POST /applications for creating (no sk) or replacing (sk) a card. */
export const saveApplicationSchema = z.object({
  sk: z.string().min(1).nullish(),
  company: z.string().trim().min(1, "Company is required"),
  position: z.string().trim().min(1, "Position is required"),
  location: optionalText,
  // An unknown status falls back to "Applied" rather than failing the save.
  status: applicationStatusSchema.catch("Applied"),
  dateApplied: z.string().nullish(),
  url: optionalText,
  source: optionalText,
  salaryRange: optionalText,
  contact: optionalText,
  notes: optionalText,
  createdAt: z.string().nullish(),
});
export type SaveApplicationInput = z.input<typeof saveApplicationSchema>;
/** A save request after validation and defaults. */
export type SaveApplicationData = z.output<typeof saveApplicationSchema>;

/** Body of POST /applications for the board's quick "Move to" control. */
export const updateStatusSchema = z.object({
  action: z.literal("UPDATE_STATUS"),
  sk: z.string().min(1),
  status: applicationStatusSchema,
});
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export type UpdateStatusResult = {
  success: true;
  sk: string;
  status: ApplicationStatus;
  updatedAt: string;
};
