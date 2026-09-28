import type { Application, ApplicationStatus } from "@lifehub/shared";

export const FORM_TEXT_FIELDS = [
  "company",
  "position",
  "location",
  "dateApplied",
  "url",
  "source",
  "salaryRange",
  "contact",
  "notes",
] as const;
export type FormTextField = (typeof FORM_TEXT_FIELDS)[number];

/** What the add/edit modal edits; sent as-is to POST /applications. */
export type ApplicationForm = Record<FormTextField, string> & {
  sk: string | null;
  status: ApplicationStatus;
  createdAt: string | null;
};

export function emptyForm(): ApplicationForm {
  return {
    sk: null,
    company: "",
    position: "",
    location: "",
    status: "Applied",
    dateApplied: new Date().toISOString().slice(0, 10),
    url: "",
    source: "",
    salaryRange: "",
    contact: "",
    notes: "",
    createdAt: null,
  };
}

export function formFromApplication(app: Application): ApplicationForm {
  return {
    sk: app.sk,
    company: app.company,
    position: app.position,
    location: app.location ?? "",
    status: app.status,
    dateApplied: app.dateApplied,
    url: app.url ?? "",
    source: app.source ?? "",
    salaryRange: app.salaryRange ?? "",
    contact: app.contact ?? "",
    notes: app.notes ?? "",
    createdAt: app.createdAt,
  };
}

export const isFormComplete = (form: ApplicationForm): boolean =>
  form.company.trim() !== "" && form.position.trim() !== "";
