import { useState } from "react";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@lifehub/shared";
import {
  isFormComplete,
  type ApplicationForm,
  type FormTextField,
} from "../lib/form";
import styles from "./ApplicationFormModal.module.css";

type Props = {
  initial: ApplicationForm;
  isSaving: boolean;
  onSave: (form: ApplicationForm) => void;
  onClose: () => void;
};

export function ApplicationFormModal({
  initial,
  isSaving,
  onSave,
  onClose,
}: Props) {
  const [form, setForm] = useState(initial);

  const field = (name: FormTextField, placeholder: string) => ({
    className: "ios-input-modal",
    placeholder,
    value: form[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [name]: e.target.value }),
  });

  const handleSave = () => {
    if (!isFormComplete(form)) {
      alert("Company and position are required.");
      return;
    }
    onSave(form);
  };

  return (
    <div className="ios-modal-overlay">
      <div className="ios-modal" role="dialog" aria-modal="true">
        <div className="ios-modal-header">
          {form.sk ? "Edit Application" : "New Application"}
          <button
            className="ios-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className={`ios-modal-content ${styles.content}`}>
          <input {...field("company", "Company")} />
          <input {...field("position", "Position")} />
          <input {...field("location", "Location (e.g. Remote, NYC)")} />

          <div className={styles.row}>
            <select
              className="ios-input-modal"
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as ApplicationStatus,
                })
              }
            >
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input {...field("dateApplied", "Date applied")} type="date" />
          </div>

          <input {...field("url", "Job posting link")} />

          <div className={styles.row}>
            <input {...field("source", "Source (e.g. Referral, LinkedIn)")} />
            <input {...field("salaryRange", "Salary range")} />
          </div>

          <input {...field("contact", "Contact / referral name")} />
          <textarea
            {...field("notes", "Notes")}
            className={`ios-input-modal ${styles.notes}`}
          />

          <button
            onClick={handleSave}
            className={styles.submit}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
