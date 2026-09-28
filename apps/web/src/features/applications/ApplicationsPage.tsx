import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Application, ApplicationStatus } from "@lifehub/shared";
import { isAdmin, useProfile } from "../../shared/hooks/useProfile";
import { ApplicationBoard } from "./components/ApplicationBoard";
import { ApplicationFormModal } from "./components/ApplicationFormModal";
import {
  emptyForm,
  formFromApplication,
  type ApplicationForm,
} from "./lib/form";
import {
  useApplications,
  useDeleteApplication,
  useSaveApplication,
  useUpdateApplicationStatus,
} from "./queries";

export function ApplicationsPage() {
  const navigate = useNavigate();
  const profile = useProfile();
  const canView = isAdmin(profile.data);

  const applications = useApplications(canView);
  const save = useSaveApplication();
  const updateStatus = useUpdateApplicationStatus();
  const remove = useDeleteApplication();

  // null = closed; otherwise the form the modal opens with
  const [editing, setEditing] = useState<ApplicationForm | null>(null);

  // Admin-only tool: send everyone else back to the hub.
  useEffect(() => {
    if (profile.isError || (profile.isSuccess && !canView)) navigate("/");
  }, [profile.isError, profile.isSuccess, canView, navigate]);

  if (!canView) {
    return (
      <div className="view tool-view">
        <header className="ios-nav-bar">
          <h2>Loading...</h2>
        </header>
      </div>
    );
  }

  const handleSave = (form: ApplicationForm) =>
    save.mutate(form, {
      onSuccess: () => setEditing(null),
      onError: () => alert("Failed to save this application."),
    });

  const handleMove = (app: Application, status: ApplicationStatus) =>
    updateStatus.mutate(
      { sk: app.sk, status },
      {
        onError: () =>
          alert("Failed to move this application. Please try again."),
      },
    );

  const handleDelete = (app: Application) => {
    if (window.confirm(`Delete the ${app.company} application?`))
      remove.mutate(app.sk);
  };

  return (
    <div className="view tool-view">
      <header className="ios-nav-bar">
        <button onClick={() => navigate("/")} className="ios-back-btn">
          ‹ Hub
        </button>
        <h2>Applications</h2>
        <button
          className="ios-add-btn"
          onClick={() => setEditing(emptyForm())}
          aria-label="Add application"
        >
          +
        </button>
      </header>

      <ApplicationBoard
        applications={applications.data ?? []}
        onEdit={(app) => setEditing(formFromApplication(app))}
        onDelete={handleDelete}
        onMove={handleMove}
      />

      {editing && (
        <ApplicationFormModal
          initial={editing}
          isSaving={save.isPending}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
