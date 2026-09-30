import { useState, type FormEvent } from "react";
import { errorText } from "../lib/signIn";
import { useSetPermanentPassword } from "../queries";
import { ErrorBanner } from "./ErrorBanner";
import styles from "./form.module.css";

/** Replaces the temporary password an invite comes with. */
export function NewPasswordForm({ onSignedIn }: { onSignedIn: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const setPassword = useSetPermanentPassword();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPassword.mutate(newPassword, {
      onSuccess: (isSignedIn) => {
        if (isSignedIn) onSignedIn();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.intro}>
        <h3>Welcome! 👋</h3>
        <p>
          You are using a temporary password. Please set a permanent one to
          continue.
        </p>
      </div>

      {setPassword.isError && (
        <ErrorBanner>
          {errorText(
            setPassword.error,
            "Failed to set new password. Ensure it has 12 chars, uppercase, lowercase, number, and symbol.",
          )}
        </ErrorBanner>
      )}

      <input
        className={styles.input}
        type="password"
        placeholder="New Permanent Password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
      />

      <ul className={styles.rules}>
        <li>At least 12 characters</li>
        <li>Uppercase & lowercase letters</li>
        <li>At least 1 number</li>
        <li>At least 1 symbol (e.g., !@#$)</li>
      </ul>

      <button
        type="submit"
        className={styles.submit}
        disabled={setPassword.isPending}
      >
        {setPassword.isPending ? "Updating..." : "Update Password & Enter Hub"}
      </button>
    </form>
  );
}
